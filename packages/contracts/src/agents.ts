import { z } from "zod";
import { emailSnapshotSchema } from "./scan";

/**
 * Agentes inteligentes de Mail Guard.
 *
 * - Analista (reactivo basado en modelo, semiautomático): analiza el correo
 *   que el usuario le pide y consulta la base de conocimiento del Centinela.
 * - Centinela (deliberativo basado en objetivos, automático): percibe los
 *   análisis agregados, detecta campañas y actúa (publica amenazas y avisa).
 */

export const THREAT_LEVELS = ["suspicious", "dangerous"] as const;
export const AGENT_TRIGGERS = ["automatic", "manual", "event"] as const;
export const SENTINEL_DECISIONS = [
  "flag",
  "escalate",
  "refresh",
  "retire",
  "ignore",
] as const;
export const SENTINEL_ACTIONS = [
  "add_threat",
  "update_threat",
  "retire_threat",
  "alert_users",
] as const;

export const threatLevelSchema = z.enum(THREAT_LEVELS);

/** Un dominio en la base de conocimiento del Centinela. */
export const threatDomainSchema = z.object({
  domain: z.string().min(1).max(253),
  level: threatLevelSchema,
  dangerousReports: z.number().int().min(0),
  suspiciousReports: z.number().int().min(0),
  affectedUsers: z.number().int().min(0),
  priority: z.number(),
  reason: z.string().max(300),
  active: z.boolean(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
});

/** Lo mínimo que el Analista necesita de cada amenaza. */
export const threatIntelSchema = z.object({
  domain: z.string().min(1).max(253),
  level: threatLevelSchema,
  reports: z.number().int().min(0),
});

export const sentinelDecisionSchema = z.object({
  domain: z.string().max(253),
  decision: z.enum(SENTINEL_DECISIONS),
  level: threatLevelSchema.optional(),
  priority: z.number(),
  reason: z.string().max(300),
});

export const sentinelActionSchema = z.object({
  type: z.enum(SENTINEL_ACTIONS),
  domain: z.string().max(253),
  detail: z.string().max(300),
});

export const sentinelPerceptionSchema = z.object({
  windowDays: z.number().int(),
  scansObserved: z.number().int(),
  domainsObserved: z.number().int(),
  knownThreats: z.number().int(),
});

/** Una ejecución completa del ciclo percibir → deliberar → actuar. */
export const agentRunSchema = z.object({
  id: z.string(),
  agent: z.string(),
  trigger: z.enum(AGENT_TRIGGERS),
  status: z.enum(["completed", "failed"]),
  startedAt: z.string(),
  finishedAt: z.string(),
  perceived: sentinelPerceptionSchema,
  decisions: z.array(sentinelDecisionSchema),
  actions: z.array(sentinelActionSchema),
  summary: z.string().max(500),
});

export const agentAlertSchema = z.object({
  id: z.string(),
  domain: z.string(),
  level: threatLevelSchema,
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});

// ── Requests / responses ────────────────────────────────────────────────
export const agentsOverviewResponseSchema = z.object({
  sentinel: z.object({
    enabled: z.boolean(),
    intervalMinutes: z.number().int(),
    lastRun: agentRunSchema.nullable(),
  }),
  threats: z.array(threatDomainSchema),
  alerts: z.array(agentAlertSchema),
  runs: z.array(agentRunSchema),
});

export const sentinelRunResponseSchema = z.object({ run: agentRunSchema });

export const markAlertsReadResponseSchema = z.object({
  updated: z.number().int(),
});

/** Interno (history → gateway): amenazas activas para el Analista. */
export const threatFeedResponseSchema = z.object({
  threats: z.array(threatIntelSchema),
});

/** Interno (gateway → analysis): el correo más la base de conocimiento. */
export const analyzeRequestSchema = z.object({
  email: emailSnapshotSchema,
  threats: z.array(threatIntelSchema).max(1_000).optional(),
});

export type ThreatLevel = z.infer<typeof threatLevelSchema>;
export type AgentTrigger = (typeof AGENT_TRIGGERS)[number];
export type ThreatDomain = z.infer<typeof threatDomainSchema>;
export type ThreatIntel = z.infer<typeof threatIntelSchema>;
export type SentinelDecision = z.infer<typeof sentinelDecisionSchema>;
export type SentinelAction = z.infer<typeof sentinelActionSchema>;
export type SentinelPerception = z.infer<typeof sentinelPerceptionSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type AgentAlert = z.infer<typeof agentAlertSchema>;
export type AgentsOverview = z.infer<typeof agentsOverviewResponseSchema>;
