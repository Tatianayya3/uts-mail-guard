import { Hono, type Context, type MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { routePath } from "hono/route";
import { secureHeaders } from "hono/secure-headers";
import { timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import { AppError, badRequest, unauthorized } from "./errors";
import type { Logger } from "./logger";
import { createMetrics, type Metrics } from "./metrics";

export const INTERNAL_TOKEN_HEADER = "x-internal-token";
export const REQUEST_ID_HEADER = "x-request-id";

/** Rutas de infraestructura que no se registran en logs ni métricas. */
const PROBES = new Set(["/health", "/metrics"]);

type ServiceAppOptions = {
  /** Registro de métricas; pásalo si el servicio define contadores propios. */
  metrics?: Metrics;
  /** Si se define, GET /metrics exige `Authorization: Bearer <token>`. */
  metricsToken?: string;
};

/**
 * Crea la app base de un microservicio: request-id, cabeceras seguras, log de
 * acceso, métricas Prometheus, manejo uniforme de errores ({ error }),
 * GET /health y GET /metrics.
 */
export function createServiceApp(
  name: string,
  logger: Logger,
  {
    metrics = createMetrics(name),
    metricsToken = process.env.METRICS_TOKEN?.trim() || undefined,
  }: ServiceAppOptions = {},
) {
  const app = new Hono();

  app.use(requestId({ headerName: REQUEST_ID_HEADER }));
  app.use(secureHeaders());
  app.use(async (c, next) => {
    const started = performance.now();
    await next();
    if (PROBES.has(c.req.path)) return;
    const elapsed = performance.now() - started;
    // Ruta con parámetros (/v1/scans/:id) para no crear una serie por id.
    const route = c.res.status === 404 ? "not_found" : routePath(c, -1);
    metrics.observeRequest(c.req.method, route, c.res.status, elapsed / 1000);
    logger.info("request", {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(elapsed),
    });
  });

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: name,
      uptime: Math.round(process.uptime()),
    }),
  );

  app.get("/metrics", async (c) => {
    if (metricsToken && bearerToken(c) !== metricsToken) throw unauthorized();
    return c.text(await metrics.registry.metrics(), 200, {
      "Content-Type": metrics.registry.contentType,
    });
  });

  app.notFound((c) => c.json({ error: "Ruta no encontrada." }, 404));

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }
    // Errores HTTP de los middlewares de Hono (p. ej. bodyLimit → 413): se
    // respeta su código en lugar de convertirlos en 500.
    if (error instanceof HTTPException) {
      const message =
        error.status === 413
          ? "La solicitud es demasiado grande."
          : error.message || "La solicitud no es válida.";
      return c.json({ error: message, code: "http_error" }, error.status);
    }
    logger.error("unhandled_error", {
      requestId: c.get("requestId"),
      message: error.message,
      stack: error.stack,
    });
    return c.json({ error: "Error interno del servicio." }, 500);
  });

  return app;
}

/** Solo deja pasar llamadas que traen el token interno (las del gateway). */
export function requireInternalToken(expected: string): MiddlewareHandler {
  const expectedBuffer = Buffer.from(expected);
  return async (c, next) => {
    const received = Buffer.from(c.req.header(INTERNAL_TOKEN_HEADER) ?? "");
    const valid =
      received.length === expectedBuffer.length &&
      timingSafeEqual(received, expectedBuffer);
    if (!valid) throw unauthorized("Llamada interna no autorizada.");
    await next();
  };
}

/** Lee y valida el cuerpo JSON con un schema; 400 con mensaje claro si falla. */
export async function readJson<S extends z.ZodType>(
  c: Context,
  schema: S,
  message = "La solicitud no es válida.",
): Promise<z.infer<S>> {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw badRequest(message);
  return parsed.data;
}

export function bearerToken(c: Context): string | null {
  const header = c.req.header("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
