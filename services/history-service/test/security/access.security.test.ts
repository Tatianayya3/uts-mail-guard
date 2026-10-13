/**
 * history-service exige dos llaves: el token interno (solo el gateway puede
 * llamarlo) y el JWT del usuario (define de quién son los datos).
 */
import { describe, expect, test } from "bun:test";
import { createLogger, INTERNAL_TOKEN_HEADER } from "@mail-guard/service-kit";
import type {
  ScanRepository,
  UserContextFactory,
} from "../../src/application/ports";
import { createRoutes } from "../../src/http/routes";

const logger = createLogger("test");
logger.info = () => {};

const TOKEN = "token-interno-secreto";
const JWT = "jwt-valido-de-ana";

const emptyRepo: ScanRepository = {
  insertMany: async (scans) => scans.length,
  listRecent: async () => [],
  getAnalytics: async () => null,
  getProfile: async () => null,
  getById: async () => null,
  updateProfile: async () => {},
  deleteAll: async () => 0,
};

const users: UserContextFactory = {
  fromToken: async (token) =>
    token === JWT
      ? {
          user: {
            id: "ana",
            email: null,
            fullName: null,
            avatarUrl: null,
            createdAt: null,
          },
          scans: emptyRepo,
        }
      : null,
};

const app = createRoutes({ logger, internalToken: TOKEN, users });
const get = (headers: Record<string, string>) =>
  app.request("/v1/scans", { headers });

describe("Doble llave: token interno + JWT", () => {
  test("con JWT válido pero sin token interno → 401 (no se puede saltar el gateway)", async () => {
    expect((await get({ Authorization: `Bearer ${JWT}` })).status).toBe(401);
  });

  test("con token interno pero sin JWT → 401", async () => {
    expect((await get({ [INTERNAL_TOKEN_HEADER]: TOKEN })).status).toBe(401);
  });

  test("con token interno y un JWT inválido → 401", async () => {
    const res = await get({
      [INTERNAL_TOKEN_HEADER]: TOKEN,
      Authorization: "Bearer jwt-inventado",
    });
    expect(res.status).toBe(401);
  });

  test("con las dos llaves → 200", async () => {
    const res = await get({
      [INTERNAL_TOKEN_HEADER]: TOKEN,
      Authorization: `Bearer ${JWT}`,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ scans: [] });
  });

  test("un id que no es UUID se rechaza sin consultar la base → 404", async () => {
    const res = await app.request("/v1/scans/1%20OR%201=1", {
      headers: {
        [INTERNAL_TOKEN_HEADER]: TOKEN,
        Authorization: `Bearer ${JWT}`,
      },
    });
    expect(res.status).toBe(404);
  });
});

describe("Sin Supabase configurado", () => {
  test("el historial responde 503 en lugar de fallar o exponer datos", async () => {
    const offline = createRoutes({ logger, internalToken: TOKEN, users: null });
    const res = await offline.request("/v1/scans", {
      headers: {
        [INTERNAL_TOKEN_HEADER]: TOKEN,
        Authorization: `Bearer ${JWT}`,
      },
    });
    expect(res.status).toBe(503);
  });
});
