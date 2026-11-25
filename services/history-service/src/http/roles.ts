import type { Context, MiddlewareHandler } from "hono";
import { isAdmin, type Role } from "@mail-guard/contracts";
import { forbidden } from "@mail-guard/service-kit";
import type { HistoryEnv } from "./routes";

/**
 * Rol del usuario autenticado, leído de SU perfil con su propio JWT (RLS).
 * Se guarda en el contexto para no consultarlo dos veces en la misma petición.
 */
export async function roleOf(c: Context<HistoryEnv>): Promise<Role> {
  const cached = c.get("role");
  if (cached) return cached;
  const profile = await c.var.scans.getProfile().catch(() => null);
  const role: Role = isAdmin(profile) ? "admin" : "user";
  c.set("role", role);
  return role;
}

/** Corta con 403 si quien llama no es admin. Va después de `authenticate`. */
export const requireAdmin: MiddlewareHandler<HistoryEnv> = async (c, next) => {
  if ((await roleOf(c)) !== "admin")
    throw forbidden("Esta sección es solo para administradores.");
  await next();
};
