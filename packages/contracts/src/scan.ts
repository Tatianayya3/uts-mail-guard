import { z } from "zod";

export const MAIL_PROVIDERS = ["Gmail", "Outlook", "Unknown"] as const;
export const VERDICTS = ["safe", "suspicious", "dangerous", "unknown"] as const;
export const SIGNAL_KEYS = [
  "sender",
  "authentication",
  "content",
  "links",
] as const;
export const SIGNAL_STATUSES = ["pass", "warning", "fail", "unknown"] as const;
export const DOMAIN_STATUSES = ["valid", "suspicious", "unknown"] as const;

export const LIMITS = {
  subject: 500,
  bodyText: 20_000,
  links: 100,
  syncBatch: 25,
} as const;

export const verdictSchema = z.enum(VERDICTS);
export const signalStatusSchema = z.enum(SIGNAL_STATUSES);

/** Lo que la extensión extrae del correo abierto. Nunca incluye adjuntos. */
export const emailSnapshotSchema = z.object({
  provider: z.enum(MAIL_PROVIDERS),
  sender: z.email(),
  senderName: z.string().max(200).optional(),
  subject: z.string().max(LIMITS.subject),
  bodyText: z.string().max(LIMITS.bodyText),
  links: z.array(z.url()).max(LIMITS.links),
});

export const scanSignalSchema = z.object({
  key: z.enum(SIGNAL_KEYS),
  label: z.string().max(80),
  value: z.string().max(200),
  status: signalStatusSchema,
  detail: z.string().max(300),
});

export const scanLinkSchema = z.object({
  url: z.url(),
  label: z.string().max(120),
  status: verdictSchema,
  detail: z.string().max(300),
});

export const scanSenderSchema = z.object({
  email: z.email(),
  domain: z.string().min(1).max(253),
  domainStatus: z.enum(DOMAIN_STATUSES),
  displayName: z.string().max(200),
});

/** Resultado normalizado del motor de decisión. */
export const scanAnalysisSchema = z.object({
  trustScore: z.number().int().min(0).max(100),
  verdict: verdictSchema,
  summary: z.string().max(500),
  advice: z.string().max(300),
  sender: scanSenderSchema,
  signals: z.array(scanSignalSchema).max(12),
  links: z.array(scanLinkSchema).max(LIMITS.links),
  model: z.string().max(100),
  analyzedAt: z.iso.datetime(),
  emailHash: z.string().max(128).optional(),
});

/** Un análisis junto con el contexto mínimo del correo (para historial). */
export const storedScanSchema = scanAnalysisSchema.extend({
  provider: z.string().max(80),
  subject: z.string().max(LIMITS.subject),
});

/** Un análisis ya persistido. */
export const scanRecordSchema = storedScanSchema.extend({
  id: z.string(),
  createdAt: z.string(),
});

// ── Requests / responses ────────────────────────────────────────────────
export const scanRequestSchema = z.object({ email: emailSnapshotSchema });

export const quotaSchema = z.object({
  limit: z.number().int(),
  remaining: z.number().int(),
});

export const scanResponseSchema = z.object({
  scan: storedScanSchema,
  cached: z.boolean(),
  saved: z.boolean(),
  quota: quotaSchema.nullable(),
});

export const saveScanRequestSchema = z.object({ scan: storedScanSchema });

export const syncScansRequestSchema = z.object({
  scans: z.array(storedScanSchema).max(LIMITS.syncBatch),
});

export const syncScansResponseSchema = z.object({ saved: z.number().int() });

export const scanListResponseSchema = z.object({
  scans: z.array(scanRecordSchema),
});

export type MailProvider = (typeof MAIL_PROVIDERS)[number];
export type Verdict = z.infer<typeof verdictSchema>;
export type SignalStatus = z.infer<typeof signalStatusSchema>;
export type SignalKey = (typeof SIGNAL_KEYS)[number];
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];
export type EmailSnapshot = z.infer<typeof emailSnapshotSchema>;
export type ScanSignal = z.infer<typeof scanSignalSchema>;
export type ScanLink = z.infer<typeof scanLinkSchema>;
export type ScanAnalysis = z.infer<typeof scanAnalysisSchema>;
export type StoredScan = z.infer<typeof storedScanSchema>;
export type ScanRecord = z.infer<typeof scanRecordSchema>;
export type ScanRequest = z.infer<typeof scanRequestSchema>;
export type Quota = z.infer<typeof quotaSchema>;
export type ScanResponse = z.infer<typeof scanResponseSchema>;
