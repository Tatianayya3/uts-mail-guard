import { Hono, type Context, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import {
  scanRequestSchema,
  syncScansRequestSchema,
  updateProfileRequestSchema,
} from "@mail-guard/contracts";
import {
  bearerToken,
  createServiceApp,
  readJson,
  unauthorized,
  type Logger,
  type Metrics,
} from "@mail-guard/service-kit";
import type {
  Identity,
  IdentityVerifier,
  ServiceClient,
} from "../application/ports";
import type { createScanEmail } from "../application/scan-email";

type Env = { Variables: { identity: Identity | null; requestId: string } };

type Deps = {
  logger: Logger;
  corsOrigins: string[];
  identity: IdentityVerifier;
  analysis: ServiceClient;
  history: ServiceClient;
  scanEmail: ReturnType<typeof createScanEmail>;
  metrics?: Metrics;
};

/** IP del cliente para la cuota anónima (primera de X-Forwarded-For). */
function clientKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    "anonymous"
  );
}

export function createRoutes(deps: Deps) {
  const app = createServiceApp("gateway", deps.logger, {
    metrics: deps.metrics,
  });

  app.use(
    "*",
    cors({
      origin: deps.corsOrigins.includes("*") ? "*" : deps.corsOrigins,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86_400,
    }),
  );

  /** Estado de cada microservicio, útil para demos y monitoreo. */
  app.get("/health/services", async (c) => {
    const check = async (client: ServiceClient) => {
      try {
        await client.request("/health");
        return "ok";
      } catch {
        return "down";
      }
    };
    const [analysis, history] = await Promise.all([
      check(deps.analysis),
      check(deps.history),
    ]);
    const engine = await deps.analysis
      .request<{ engine: string }>("/v1/engine")
      .then((r) => r.engine)
      .catch(() => null);
    return c.json({ gateway: "ok", analysis, history, engine });
  });

  const v1 = new Hono<Env>();
  v1.use("*", bodyLimit({ maxSize: 512 * 1024 }));

  // Identifica al usuario si envía JWT; un token inválido se trata como anónimo.
  const identify: MiddlewareHandler<Env> = async (c, next) => {
    const token = bearerToken(c);
    c.set("identity", token ? await deps.identity.verify(token) : null);
    await next();
  };
  const requireUser: MiddlewareHandler<Env> = async (c, next) => {
    if (!c.var.identity) throw unauthorized("Inicia sesión para continuar.");
    await next();
  };

  v1.use("*", identify);

  v1.post("/scans", async (c) => {
    const { email } = await readJson(
      c,
      scanRequestSchema,
      "La información del correo no es válida.",
    );
    const result = await deps.scanEmail({
      email,
      identity: c.var.identity,
      clientKey: clientKey(c),
      requestId: c.var.requestId,
    });
    return c.json(result);
  });

  v1.post("/scans/sync", requireUser, async (c) => {
    const body = await readJson(
      c,
      syncScansRequestSchema,
      "Los análisis no son válidos.",
    );
    return c.json(
      await deps.history.request("/v1/scans/sync", {
        method: "POST",
        body,
        token: c.var.identity!.token,
        requestId: c.var.requestId,
      }),
    );
  });

  v1.get("/scans", requireUser, async (c) => {
    const limit = encodeURIComponent(c.req.query("limit") ?? "20");
    return c.json(
      await deps.history.request(`/v1/scans?limit=${limit}`, {
        token: c.var.identity!.token,
        requestId: c.var.requestId,
      }),
    );
  });

  // Proxy autenticado hacia history-service, mismo verbo y ruta.
  const toHistory = (
    c: Context<Env>,
    path: string,
    method: "GET" | "PATCH" | "DELETE",
    body?: unknown,
  ) =>
    deps.history.request(path, {
      method,
      body,
      token: c.var.identity!.token,
      requestId: c.var.requestId,
    });

  v1.get("/scans/:id", requireUser, async (c) =>
    c.json(
      await toHistory(
        c,
        `/v1/scans/${encodeURIComponent(c.req.param("id"))}`,
        "GET",
      ),
    ),
  );

  v1.delete("/scans", requireUser, async (c) =>
    c.json(await toHistory(c, "/v1/scans", "DELETE")),
  );

  v1.patch("/me", requireUser, async (c) => {
    const body = await readJson(
      c,
      updateProfileRequestSchema,
      "El nombre no es válido.",
    );
    return c.json(await toHistory(c, "/v1/me", "PATCH", body));
  });

  v1.get("/me", requireUser, async (c) =>
    c.json(
      await deps.history.request("/v1/me", {
        token: c.var.identity!.token,
        requestId: c.var.requestId,
      }),
    ),
  );

  app.route("/v1", v1);
  return app;
}
