import type { Hono, MiddlewareHandler } from "hono";
import { updateUserRoleRequestSchema } from "@mail-guard/contracts";
import {
  AppError,
  badRequest,
  readJson,
  unavailable,
} from "@mail-guard/service-kit";
import type { AdminRepository } from "../application/ports";
import { requireAdmin } from "./roles";
import type { HistoryEnv } from "./routes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Administración de usuarios (solo admins):
 * - GET   /admin/users      → todas las personas registradas con su rol.
 * - PATCH /admin/users/:id  → cambia el rol (user ↔ admin).
 */
export function registerAdminRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- basePath("/v1") de Hono
  v1: Hono<any, any, any>,
  authenticate: MiddlewareHandler<HistoryEnv>,
  admin: AdminRepository | null,
) {
  const need = () => {
    if (!admin)
      throw unavailable(
        "La administración no está configurada (falta SUPABASE_SECRET_KEY).",
      );
    return admin;
  };

  v1.get("/admin/users", authenticate, requireAdmin, async (c) =>
    c.json({ users: await need().listUsers() }),
  );

  v1.patch("/admin/users/:id", authenticate, requireAdmin, async (c) => {
    const id = c.req.param("id");
    if (!UUID.test(id)) throw badRequest("El usuario no es válido.");
    const { role } = await readJson(
      c,
      updateUserRoleRequestSchema,
      "El rol no es válido.",
    );
    // Evita quedarse sin acceso por error: nadie se quita su propio rol admin.
    if (id === c.var.user.id && role !== "admin")
      throw badRequest("No puedes quitarte tu propio rol de administrador.");
    const user = await need().setRole(id, role);
    if (!user)
      throw new AppError(404, "No encontramos ese usuario.", "not_found");
    return c.json({ user });
  });
}
