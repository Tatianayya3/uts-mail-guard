import { describe, expect, test } from "bun:test";
import type { ScanAnalysis } from "@mail-guard/contracts";
import { createLogger } from "@mail-guard/service-kit";
import type { ServiceClient } from "../src/application/ports";
import { createScanEmail } from "../src/application/scan-email";
import { createRoutes } from "../src/http/routes";
import { createMemoryQuota } from "../src/infrastructure/quota";

const logger = createLogger("test");
logger.info = () => {};
logger.warn = () => {};

const analysisResult: ScanAnalysis = {
  trustScore: 90,
  verdict: "safe",
  summary: "ok",
  advice: "ok",
  sender: {
    email: "a@uts.edu.co",
    domain: "uts.edu.co",
    domainStatus: "unknown",
    displayName: "A",
  },
  signals: [],
  links: [],
  model: "test",
  analyzedAt: new Date().toISOString(),
  emailHash: "abc",
};

const email = {
  provider: "Gmail",
  sender: "a@uts.edu.co",
  subject: "Hola",
  bodyText: "Texto",
  links: [],
};

function setup(opts: { cached?: boolean; anonymousLimit?: number } = {}) {
  const calls: string[] = [];
  const analysis: ServiceClient = {
    request: async (path) => {
      calls.push(`analysis ${path}`);
      if (path === "/health") return {} as never;
      if (path === "/v1/engine") return { engine: "test" } as never;
      return {
        analysis: analysisResult,
        cached: opts.cached ?? false,
      } as never;
    },
  };
  const history: ServiceClient = {
    request: async (path, init) => {
      calls.push(`history ${path} ${init?.token ?? ""}`);
      return { saved: true } as never;
    },
  };
  const quota = createMemoryQuota({
    anonymous: opts.anonymousLimit ?? 2,
    authenticated: 10,
  });
  const recorded: string[] = [];
  const metrics = {
    recorded: (verdict: string, cached: boolean) =>
      recorded.push(`${verdict} cached=${cached}`),
  };
  const app = createRoutes({
    logger,
    corsOrigins: ["*"],
    identity: {
      verify: async (t) => (t === "good" ? { userId: "u1", token: t } : null),
    },
    analysis,
    history,
    scanEmail: createScanEmail({ analysis, history, quota, logger, metrics }),
  });
  const post = (headers: Record<string, string> = {}) =>
    app.request("/v1/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ email }),
    });
  return { app, calls, post, recorded };
}

describe("gateway /v1/scans", () => {
  test("anónimo: analiza, no guarda y descuenta cuota", async () => {
    const { post, calls } = setup();
    const res = await post();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      saved: boolean;
      quota: { remaining: number };
      scan: { subject: string };
    };
    expect(body.saved).toBe(false);
    expect(body.quota.remaining).toBe(1);
    expect(body.scan.subject).toBe("Hola");
    expect(calls.some((c) => c.startsWith("history"))).toBe(false);
  });

  test("autenticado: guarda en el historial con su JWT", async () => {
    const { post, calls } = setup();
    const res = await post({ Authorization: "Bearer good" });
    const body = (await res.json()) as { saved: boolean };
    expect(body.saved).toBe(true);
    expect(calls).toContain("history /v1/scans good");
  });

  test("registra el veredicto de cada análisis para el monitoreo", async () => {
    const { post, recorded } = setup({ cached: true });
    await post();
    expect(recorded).toEqual(["safe cached=true"]);
  });

  test("al agotar la cuota responde 429", async () => {
    const { post } = setup({ anonymousLimit: 1 });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
  });

  test("los resultados en caché no consumen cuota", async () => {
    const { post } = setup({ cached: true, anonymousLimit: 1 });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
  });

  test("valida el cuerpo antes de llamar a los servicios", async () => {
    const { app, calls } = setup();
    const res = await app.request("/v1/scans", { method: "POST", body: "{}" });
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("rutas privadas exigen sesión", async () => {
    const { app } = setup();
    expect((await app.request("/v1/me")).status).toBe(401);
    expect(
      (
        await app.request("/v1/me", {
          headers: { Authorization: "Bearer good" },
        })
      ).status,
    ).toBe(200);
  });

  test("reenvía detalle, edición de perfil y borrado al historial con el JWT", async () => {
    const { app, calls } = setup();
    const auth = {
      Authorization: "Bearer good",
      "Content-Type": "application/json",
    };
    expect((await app.request("/v1/scans/abc", { headers: auth })).status).toBe(
      200,
    );
    expect(
      (await app.request("/v1/scans", { method: "DELETE", headers: auth }))
        .status,
    ).toBe(200);
    expect(
      (
        await app.request("/v1/me", {
          method: "PATCH",
          headers: auth,
          body: JSON.stringify({ displayName: "Ana" }),
        })
      ).status,
    ).toBe(200);
    expect(calls).toEqual([
      "history /v1/scans/abc good",
      "history /v1/scans good",
      "history /v1/me good",
    ]);
    expect((await app.request("/v1/scans", { method: "DELETE" })).status).toBe(
      401,
    );
  });

  test("health/services informa el estado de cada servicio", async () => {
    const { app } = setup();
    const body = await (await app.request("/health/services")).json();
    expect(body).toEqual({
      gateway: "ok",
      analysis: "ok",
      history: "ok",
      engine: "test",
    });
  });
});
