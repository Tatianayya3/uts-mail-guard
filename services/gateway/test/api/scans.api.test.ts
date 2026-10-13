/**
 * Pruebas de API: peticiones HTTP reales al gateway, que llama por HTTP a
 * analysis-service e history-service. Equivalen a una colección de Postman
 * ejecutada en cada `bun test`.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  deleteHistoryResponseSchema,
  overviewResponseSchema,
  scanListResponseSchema,
  scanResponseSchema,
  syncScansResponseSchema,
  type ScanResponse,
} from "@mail-guard/contracts";
import {
  USERS,
  legitEmail,
  phishingEmail,
  startSystem,
  uniqueEmail,
  type System,
} from "../support/system";

let system: System;
beforeAll(() => {
  system = startSystem();
});
afterAll(() => system.stop());

const ana = USERS.ana.token;

describe("Salud de los servicios", () => {
  test("GET /health/services → los tres microservicios en ok", async () => {
    const res = await system.call("/health/services");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      gateway: "ok",
      analysis: "ok",
      history: "ok",
      engine: "mail-guard-heuristics-v1",
    });
  });

  test("GET /health de cada microservicio responde por separado", async () => {
    for (const url of [system.analysisUrl, system.historyUrl]) {
      const res = await fetch(`${url}/health`);
      expect(res.status).toBe(200);
      expect(((await res.json()) as { status: string }).status).toBe("ok");
    }
  });

  test("cada respuesta lleva un x-request-id para rastrear la petición", async () => {
    const res = await system.call("/health/services");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

describe("POST /v1/scans (análisis)", () => {
  test("invitado + phishing → 200, veredicto peligroso y no se guarda", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: { email: phishingEmail },
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ScanResponse;
    expect(scanResponseSchema.safeParse(body).success).toBe(true);
    expect(body.scan.verdict).toBe("dangerous");
    expect(body.scan.trustScore).toBeLessThan(40);
    expect(body.saved).toBe(false);
    expect(body.quota).toEqual({ limit: 5, remaining: 4 });
  });

  test("correo legítimo → veredicto seguro", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: { email: legitEmail },
      headers: { "x-forwarded-for": "10.0.0.2" },
    });
    const body = (await res.json()) as ScanResponse;
    expect(body.scan.verdict).toBe("safe");
    expect(body.scan.trustScore).toBeGreaterThanOrEqual(70);
  });

  test("el mismo correo otra vez sale de caché y no consume cuota", async () => {
    const send = () =>
      system.call("/v1/scans", {
        method: "POST",
        body: { email: phishingEmail },
        headers: { "x-forwarded-for": "10.0.0.1" },
      });
    const body = (await (await send()).json()) as ScanResponse;
    expect(body.cached).toBe(true);
    expect(body.quota?.remaining).toBe(4);
  });

  test("cuerpo inválido → 400 con mensaje de error", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: { email: { sender: "sin-proveedor" } },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "La información del correo no es válida.",
    });
  });

  test("JSON mal formado → 400", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: "{ esto no es json",
    });
    expect(res.status).toBe(400);
  });

  test("ruta inexistente → 404 con { error }", async () => {
    const res = await system.call("/v1/no-existe");
    expect(res.status).toBe(404);
    expect(await res.json()).toHaveProperty("error");
  });
});

describe("Historial con sesión (gateway → history-service)", () => {
  test("con sesión el análisis se guarda en el historial", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: { email: phishingEmail },
      token: ana,
    });
    const body = (await res.json()) as ScanResponse;
    expect(body.saved).toBe(true);
    expect(body.quota).toEqual({ limit: 100, remaining: 100 });
  });

  test("analizar el mismo correo no lo duplica", async () => {
    await system.call("/v1/scans", {
      method: "POST",
      body: { email: phishingEmail },
      token: ana,
    });
    const list = scanListResponseSchema.parse(
      await (await system.call("/v1/scans", { token: ana })).json(),
    );
    expect(list.scans).toHaveLength(1);
  });

  test("GET /v1/scans/:id devuelve el detalle del análisis", async () => {
    const list = scanListResponseSchema.parse(
      await (await system.call("/v1/scans", { token: ana })).json(),
    );
    const id = list.scans[0]!.id;
    const res = await system.call(`/v1/scans/${id}`, { token: ana });
    expect(res.status).toBe(200);
    const { scan } = (await res.json()) as { scan: { id: string } };
    expect(scan.id).toBe(id);
  });

  test("GET /v1/scans/:id con un id inexistente → 404", async () => {
    const res = await system.call(
      "/v1/scans/99999999-9999-4999-8999-999999999999",
      { token: ana },
    );
    expect(res.status).toBe(404);
  });

  test("POST /v1/scans/sync sube análisis hechos sin conexión", async () => {
    const pending = [uniqueEmail(1), uniqueEmail(2)];
    const scans = [];
    for (const email of pending) {
      const res = await system.call("/v1/scans", {
        method: "POST",
        body: { email },
        headers: { "x-forwarded-for": "10.0.0.9" },
      });
      scans.push(((await res.json()) as ScanResponse).scan);
    }
    const res = await system.call("/v1/scans/sync", {
      method: "POST",
      body: { scans },
      token: ana,
    });
    expect(syncScansResponseSchema.parse(await res.json()).saved).toBe(2);
  });

  test("GET /v1/me devuelve perfil y métricas calculadas", async () => {
    const overview = overviewResponseSchema.parse(
      await (await system.call("/v1/me", { token: ana })).json(),
    );
    expect(overview.profile.id).toBe(USERS.ana.id);
    expect(overview.analytics.totalScans).toBe(3);
    expect(overview.analytics.dangerousScans).toBe(1);
  });

  test("PATCH /v1/me cambia el nombre visible", async () => {
    const res = await system.call("/v1/me", {
      method: "PATCH",
      body: { displayName: "Ana Pérez" },
      token: ana,
    });
    expect(res.status).toBe(200);
    expect(
      overviewResponseSchema.parse(await res.json()).profile.displayName,
    ).toBe("Ana Pérez");
  });

  test("PATCH /v1/me con un nombre de 1 letra → 400", async () => {
    const res = await system.call("/v1/me", {
      method: "PATCH",
      body: { displayName: "A" },
      token: ana,
    });
    expect(res.status).toBe(400);
  });

  test("DELETE /v1/scans borra todo el historial del usuario", async () => {
    const res = await system.call("/v1/scans", {
      method: "DELETE",
      token: ana,
    });
    expect(deleteHistoryResponseSchema.parse(await res.json()).deleted).toBe(3);
    const list = scanListResponseSchema.parse(
      await (await system.call("/v1/scans", { token: ana })).json(),
    );
    expect(list.scans).toHaveLength(0);
  });
});
