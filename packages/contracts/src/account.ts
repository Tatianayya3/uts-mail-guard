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
