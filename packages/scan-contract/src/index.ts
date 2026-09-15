import { z } from "zod";

export const emailSnapshotSchema = z.object({
  provider: z.enum(["Gmail", "Outlook", "Unknown"]),
  sender: z.string().email(),
  subject: z.string().max(500),
  bodyText: z.string().max(20_000),
  links: z.array(z.string().url()).max(100),
});

export const scanAnalysisSchema = z.object({
  trustScore: z.number().int().min(0).max(100),
  verdict: z.enum(["safe", "suspicious", "dangerous", "unknown"]),
  summary: z.string().max(500),
  advice: z.string().max(300),
  sender: z.object({
    email: z.string().email(),
    domain: z.string().min(1).max(253),
    domainStatus: z.enum(["valid", "suspicious", "unknown"]),
    displayName: z.string().max(200),
  }),
  signals: z
    .array(
      z.object({
        key: z.enum(["sender", "authentication", "content", "links"]),
        label: z.string().max(80),
        value: z.string().max(200),
        status: z.enum(["pass", "warning", "fail", "unknown"]),
        detail: z.string().max(300),
      }),
    )
    .max(12),
  links: z
    .array(
      z.object({
        url: z.string().url(),
        label: z.string().max(120),
        status: z.enum(["safe", "suspicious", "dangerous", "unknown"]),
        detail: z.string().max(300),
      }),
    )
    .max(100),
  model: z.string().max(100),
  analyzedAt: z.string().datetime(),
  emailHash: z.string().optional(),
});

export const scanRequestSchema = z.object({
  email: emailSnapshotSchema,
});

export const storedScanSchema = scanAnalysisSchema.extend({
  provider: z.string().max(80),
  subject: z.string().max(500),
});

export const scanHistoryRequestSchema = z.object({
  scan: storedScanSchema,
});

export const scanHistorySyncSchema = z.object({
  scans: z.array(storedScanSchema).max(25),
});

export type EmailSnapshot = z.infer<typeof emailSnapshotSchema>;
export type ScanAnalysis = z.infer<typeof scanAnalysisSchema>;
export type ScanRequest = z.infer<typeof scanRequestSchema>;
export type StoredScan = z.infer<typeof storedScanSchema>;
