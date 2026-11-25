import { z } from "zod";

export const profileSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  role: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
});

export const analyticsSchema = z.object({
  totalScans: z.number().int(),
  safeScans: z.number().int(),
  suspiciousScans: z.number().int(),
  dangerousScans: z.number().int(),
  unknownScans: z.number().int(),
  linksReviewed: z.number().int(),
  averageTrustScore: z.number(),
  lastScannedAt: z.string().nullable(),
});

export const overviewResponseSchema = z.object({
  profile: profileSchema,
  analytics: analyticsSchema,
});

export type Profile = z.infer<typeof profileSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export type Overview = z.infer<typeof overviewResponseSchema>;

export const EMPTY_ANALYTICS: Analytics = {
  totalScans: 0,
  safeScans: 0,
  suspiciousScans: 0,
  dangerousScans: 0,
  unknownScans: 0,
  linksReviewed: 0,
  averageTrustScore: 0,
  lastScannedAt: null,
};

export const updateProfileRequestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 caracteres.")
    .max(80, "Máximo 80 caracteres."),
});

export const deleteHistoryResponseSchema = z.object({
  deleted: z.number().int(),
});

export type UpdateProfileValues = z.infer<typeof updateProfileRequestSchema>;

// ── Roles y administración ──────────────────────────────────────────────
export const ROLES = ["user", "admin"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const ROLE_LABEL: Record<Role, string> = {
  user: "Usuario",
  admin: "Administrador",
};

/** El perfil es admin solo si su rol lo dice explícitamente. */
export const isAdmin = (profile: { role: string | null } | null | undefined) =>
  profile?.role === "admin";

/** Una persona registrada, vista por un administrador. */
export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  role: roleSchema,
  createdAt: z.string().nullable(),
  lastSignInAt: z.string().nullable(),
  totalScans: z.number().int(),
});

export const adminUsersResponseSchema = z.object({
  users: z.array(adminUserSchema),
});

export const updateUserRoleRequestSchema = z.object({ role: roleSchema });

export const updateUserRoleResponseSchema = z.object({
  user: adminUserSchema,
});

export type AdminUser = z.infer<typeof adminUserSchema>;
