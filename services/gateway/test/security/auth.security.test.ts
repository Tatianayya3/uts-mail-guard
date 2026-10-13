/**
 * Seguridad en el gateway: autenticación (quién eres), autorización (a qué
 * datos accedes) y protección contra abuso. Peticiones HTTP reales contra los
 * tres microservicios.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { ScanResponse } from "@mail-guard/contracts";
import {
  USERS,
  phishingEmail,
  startSystem,
  uniqueEmail,
  type System,
} from "../support/system";

let system: System;
beforeAll(() => {
  system = startSystem({ anonymousLimit: 3 });
});
afterAll(() => system.stop());

const PRIVATE_ROUTES: [method: string, path: string, body?: unknown][] = [
  ["GET", "/v1/scans"],
  ["GET", "/v1/scans/00000000-0000-4000-8000-000000000001"],
  ["DELETE", "/v1/scans"],
  ["GET", "/v1/me"],
  ["PATCH", "/v1/me", { displayName: "Intruso" }],
  ["POST", "/v1/scans/sync", { scans: [] }],
];

describe("Autenticación", () => {
  test("sin token, todas las rutas privadas responden 401", async () => {
    for (const [method, path, body] of PRIVATE_ROUTES) {
      const res = await system.call(path, { method, body });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  test("con un JWT falso, las rutas privadas responden 401", async () => {
    for (const [method, path, body] of PRIVATE_ROUTES) {
      const res = await system.call(path, {
        method,
        body,
        token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ5byJ9.firma-falsa",
      });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  test("un esquema distinto de Bearer (Basic) no autentica", async () => {
    const res = await system.call("/v1/me", {
      headers: { Authorization: `Basic ${btoa("ana:123456")}` },
    });
    expect(res.status).toBe(401);
  });

  test("el mensaje de 401 no revela detalles internos", async () => {
    const res = await system.call("/v1/me");
    expect(await res.json()).toEqual({
      error: "Inicia sesión para continuar.",
      code: "unauthorized",
    });
  });

  test("con un token inválido el análisis funciona como invitado y no guarda nada", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: { email: phishingEmail },
      token: "token-inventado",
      headers: { "x-forwarded-for": "10.1.0.1" },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as ScanResponse).saved).toBe(false);
    expect(system.rows.size).toBe(0);
  });
});

describe("Autorización: cada usuario solo ve sus datos", () => {
  let anaScanId = "";

  beforeAll(async () => {
    await system.call("/v1/scans", {
      method: "POST",
      body: { email: phishingEmail },
      token: USERS.ana.token,
    });
    await system.call("/v1/scans", {
      method: "POST",
      body: { email: uniqueEmail(7) },
      token: USERS.luis.token,
    });
    const list = (await (
      await system.call("/v1/scans", { token: USERS.ana.token })
    ).json()) as { scans: { id: string }[] };
    anaScanId = list.scans[0]!.id;
  });

  test("Luis no ve los análisis de Ana en su historial", async () => {
    const list = (await (
      await system.call("/v1/scans", { token: USERS.luis.token })
    ).json()) as { scans: { id: string; subject: string }[] };
    expect(list.scans).toHaveLength(1);
    expect(list.scans.map((s) => s.id)).not.toContain(anaScanId);
  });

  test("Luis no puede abrir un análisis de Ana aunque conozca su id → 404", async () => {
    const res = await system.call(`/v1/scans/${anaScanId}`, {
      token: USERS.luis.token,
    });
    expect(res.status).toBe(404);
  });

  test("el borrado de Luis no toca el historial de Ana", async () => {
    await system.call("/v1/scans", {
      method: "DELETE",
      token: USERS.luis.token,
    });
    const list = (await (
      await system.call("/v1/scans", { token: USERS.ana.token })
    ).json()) as { scans: unknown[] };
    expect(list.scans).toHaveLength(1);
  });

  test("el usuario sale del JWT, no de parámetros que envíe el cliente", async () => {
    const res = await system.call(`/v1/scans?profile_id=${USERS.ana.id}`, {
      token: USERS.luis.token,
    });
    const list = (await res.json()) as { scans: unknown[] };
    expect(list.scans).toHaveLength(0);
  });
});

describe("Protección contra abuso", () => {
  test("la cuota diaria limita al invitado: al superarla responde 429", async () => {
    const statuses: number[] = [];
    for (let n = 0; n < 4; n++) {
      const res = await system.call("/v1/scans", {
        method: "POST",
        body: { email: uniqueEmail(100 + n) },
        headers: { "x-forwarded-for": "10.2.0.1" },
      });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  test("el usuario con sesión tiene su propia cuota, más amplia", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: { email: uniqueEmail(200) },
      token: USERS.ana.token,
      headers: { "x-forwarded-for": "10.2.0.1" },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as ScanResponse).quota?.limit).toBe(100);
  });

  test("un cuerpo de más de 512 KB se rechaza con 413", async () => {
    const res = await system.call("/v1/scans", {
      method: "POST",
      body: {
        email: { ...phishingEmail, bodyText: "a".repeat(600 * 1024) },
      },
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({
      error: "La solicitud es demasiado grande.",
    });
  });
});

describe("Cabeceras de seguridad", () => {
  test("las respuestas incluyen cabeceras seguras (nosniff, frame, referrer)", async () => {
    const res = await system.call("/health/services");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  test("CORS solo permite los métodos y cabeceras que usa la app", async () => {
    const res = await system.call("/v1/scans", {
      method: "OPTIONS",
      headers: {
        Origin: "chrome-extension://abc",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    expect(res.headers.get("access-control-allow-headers")).toBe(
      "Content-Type,Authorization",
    );
  });
});
