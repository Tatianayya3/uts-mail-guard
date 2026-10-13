/**
 * analysis-service no es público: solo el gateway puede llamarlo, enviando el
 * token interno compartido (cabecera x-internal-token).
 */
import { describe, expect, test } from "bun:test";
import { createLogger, INTERNAL_TOKEN_HEADER } from "@mail-guard/service-kit";
import { createAnalyzeEmail } from "../../src/application/analyze-email";
import { createRoutes } from "../../src/http/routes";
import { createMemoryCache } from "../../src/infrastructure/cache";
import { heuristicEngine } from "../../src/infrastructure/engines/heuristic.engine";
import { phishingEmail } from "../fixtures";

const logger = createLogger("test");
logger.info = () => {};

const TOKEN = "token-interno-secreto";
const app = createRoutes({
  logger,
  internalToken: TOKEN,
  engineName: heuristicEngine.name,
  analyzeEmail: createAnalyzeEmail({
    engine: heuristicEngine,
    cache: createMemoryCache(60),
    logger,
  }),
});

const analyze = (headers: Record<string, string> = {}) =>
  app.request("/v1/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ email: phishingEmail }),
  });

describe("Token interno entre microservicios", () => {
  test("sin token interno → 401", async () => {
    const res = await analyze();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: "Llamada interna no autorizada.",
    });
  });

  test("con un token incorrecto de la misma longitud → 401", async () => {
    const wrong = "x".repeat(TOKEN.length);
    expect((await analyze({ [INTERNAL_TOKEN_HEADER]: wrong })).status).toBe(
      401,
    );
  });

  test("con un token de otra longitud → 401 (sin romper la comparación)", async () => {
    expect((await analyze({ [INTERNAL_TOKEN_HEADER]: "corto" })).status).toBe(
      401,
    );
  });

  test("un JWT de usuario no sirve como token interno", async () => {
    const res = await analyze({ Authorization: `Bearer ${TOKEN}` });
    expect(res.status).toBe(401);
  });

  test("con el token correcto → 200 y el análisis", async () => {
    const res = await analyze({ [INTERNAL_TOKEN_HEADER]: TOKEN });
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty("analysis.verdict", "dangerous");
  });
});

describe("Endpoints públicos sin información sensible", () => {
  test("/health solo expone estado, nombre y tiempo activo", async () => {
    const body = (await (await app.request("/health")).json()) as object;
    expect(Object.keys(body).sort()).toEqual(["service", "status", "uptime"]);
  });

  test("/v1/engine solo dice qué motor está activo, no claves ni URLs", async () => {
    expect(await (await app.request("/v1/engine")).json()).toEqual({
      engine: heuristicEngine.name,
    });
  });
});
