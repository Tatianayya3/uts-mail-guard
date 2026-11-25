import { describe, expect, test } from "bun:test";
import type { AdminUser, Role } from "@mail-guard/contracts";
import { createLogger } from "@mail-guard/service-kit";
import type {
  AdminRepository,
  ScanRepository,
  UserContextFactory,
} from "../src/application/ports";
import { createRoutes } from "../src/http/routes";

const logger = createLogger("test");
logger.info = () => {};
logger.warn = () => {};

const TOKEN = "interno";
const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

/** Perfiles en memoria: el rol sale de aquí, como profiles.role en Supabase. */
function setup() {
  const roles = new Map<string, Role>([
    [ADMIN_ID, "admin"],
    [USER_ID, "user"],
  ]);
  const repoFor = (id: string) =>
    ({
      getProfile: async () => ({
        id,
        displayName: null,
        role: roles.get(id) ?? null,
        avatarUrl: null,
        createdAt: null,
      }),
    }) as unknown as ScanRepository;

  const users: UserContextFactory = {
    async fromToken(token) {
      const id =
        token === "jwt-admin"
          ? ADMIN_ID
          : token === "jwt-user"
            ? USER_ID
            : null;
      if (!id) return null;
      return {
        user: {
          id,
          email: null,
          fullName: null,
          avatarUrl: null,
          createdAt: null,
        },
        scans: repoFor(id),
      };
    },
  };

  const toUser = (id: string): AdminUser => ({
    id,
    email: `${id.slice(-1)}@uts.edu.co`,
    displayName: null,
    role: roles.get(id)!,
    createdAt: null,
    lastSignInAt: null,
    totalScans: 0,
  });
  const admin: AdminRepository = {
    listUsers: async () => [...roles.keys()].map(toUser),
    setRole: async (id, role) => {
      if (!roles.has(id)) return null;
      roles.set(id, role);
      return toUser(id);
    },
  };

  const app = createRoutes({ logger, internalToken: TOKEN, users, admin });
  const call = (path: string, token: string, init: RequestInit = {}) =>
    app.request(path, {
      ...init,
      headers: {
        "x-internal-token": TOKEN,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  return { call, roles };
}

describe("Administración de usuarios", () => {
  test("un usuario normal recibe 403", async () => {
    const { call } = setup();
    expect((await call("/v1/admin/users", "jwt-user")).status).toBe(403);
  });

  test("un admin lista a todos con su rol", async () => {
    const { call } = setup();
    const res = await call("/v1/admin/users", "jwt-admin");
    expect(res.status).toBe(200);
    const { users } = (await res.json()) as { users: AdminUser[] };
    expect(users.map((u) => u.role).sort()).toEqual(["admin", "user"]);
  });

  test("un admin puede promover a otro usuario", async () => {
    const { call, roles } = setup();
    const res = await call(`/v1/admin/users/${USER_ID}`, "jwt-admin", {
      method: "PATCH",
      body: JSON.stringify({ role: "admin" }),
    });
    expect(res.status).toBe(200);
    expect(roles.get(USER_ID)).toBe("admin");
  });

  test("nadie se quita su propio rol de admin", async () => {
    const { call, roles } = setup();
    const res = await call(`/v1/admin/users/${ADMIN_ID}`, "jwt-admin", {
      method: "PATCH",
      body: JSON.stringify({ role: "user" }),
    });
    expect(res.status).toBe(400);
    expect(roles.get(ADMIN_ID)).toBe("admin");
  });

  test("un usuario normal no puede cambiar roles", async () => {
    const { call, roles } = setup();
    const res = await call(`/v1/admin/users/${USER_ID}`, "jwt-user", {
      method: "PATCH",
      body: JSON.stringify({ role: "admin" }),
    });
    expect(res.status).toBe(403);
    expect(roles.get(USER_ID)).toBe("user");
  });

  test("un rol inválido o un usuario inexistente se rechazan", async () => {
    const { call } = setup();
    const bad = await call(`/v1/admin/users/${USER_ID}`, "jwt-admin", {
      method: "PATCH",
      body: JSON.stringify({ role: "root" }),
    });
    expect(bad.status).toBe(400);
    const missing = await call(
      "/v1/admin/users/00000000-0000-4000-8000-000000000099",
      "jwt-admin",
      { method: "PATCH", body: JSON.stringify({ role: "admin" }) },
    );
    expect(missing.status).toBe(404);
  });
});
