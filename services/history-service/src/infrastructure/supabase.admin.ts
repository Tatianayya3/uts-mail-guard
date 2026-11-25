import { createClient, type User } from "@supabase/supabase-js";
import { roleSchema, type AdminUser, type Role } from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import type { AdminRepository } from "../application/ports";

const HINT = "¿Ejecutaste supabase/migrations/0007_roles.sql?";
/** Tope de usuarios por página en la API de administración de Supabase. */
const PER_PAGE = 1_000;

type ProfileRow = {
  id: string;
  role: string | null;
  display_name: string | null;
};
type AnalyticsRow = { profile_id: string; total_scans: number };

const toRole = (value: string | null | undefined): Role =>
  roleSchema.safeParse(value).success ? (value as Role) : "user";

/**
 * Administración de usuarios con la clave SECRETA de Supabase. Combina
 * auth.users (correo, último acceso) con profiles (rol, nombre) y las métricas.
 */
export function createSupabaseAdminRepository(
  config: { url: string; secretKey: string },
  logger: Logger,
): AdminRepository {
  const db = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const toAdminUser = (
    user: User,
    profile: ProfileRow | undefined,
    totalScans: number,
  ): AdminUser => ({
    id: user.id,
    email: user.email ?? null,
    displayName:
      profile?.display_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null),
    role: toRole(profile?.role),
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    totalScans,
  });

  return {
    async listUsers() {
      const [auth, profiles, analytics] = await Promise.all([
        db.auth.admin.listUsers({ page: 1, perPage: PER_PAGE }),
        db.from("profiles").select("id, role, display_name"),
        db.from("profile_analytics").select("profile_id, total_scans"),
      ]);
      if (auth.error || profiles.error) {
        const message = auth.error?.message ?? profiles.error?.message ?? "";
        logger.error("admin_list_users_failed", { message, hint: HINT });
        throw new Error("No se pudo leer la lista de usuarios.");
      }
      const byId = new Map(
        (profiles.data as ProfileRow[]).map((p) => [p.id, p]),
      );
      const scans = new Map(
        ((analytics.data ?? []) as AnalyticsRow[]).map((a) => [
          a.profile_id,
          a.total_scans,
        ]),
      );
      return auth.data.users
        .map((u) => toAdminUser(u, byId.get(u.id), scans.get(u.id) ?? 0))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    },

    async setRole(userId, role) {
      const { data: found, error: findError } =
        await db.auth.admin.getUserById(userId);
      if (findError || !found.user) return null;

      // upsert: un usuario antiguo podría no tener fila en profiles.
      const { data, error } = await db
        .from("profiles")
        .upsert({ id: userId, role }, { onConflict: "id" })
        .select("id, role, display_name")
        .single();
      if (error) {
        logger.error("admin_set_role_failed", {
          message: error.message,
          hint: HINT,
        });
        throw new Error("No se pudo cambiar el rol.");
      }
      const { data: stats } = await db
        .from("profile_analytics")
        .select("total_scans")
        .eq("profile_id", userId)
        .maybeSingle();
      return toAdminUser(
        found.user,
        data as ProfileRow,
        (stats as { total_scans: number } | null)?.total_scans ?? 0,
      );
    },
  };
}
