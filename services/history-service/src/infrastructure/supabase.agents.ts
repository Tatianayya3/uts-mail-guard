import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  agentRunSchema,
  type AgentAlert,
  type AgentRun,
  type ThreatDomain,
} from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import type {
  AlertRepository,
  SentinelRepository,
} from "../agents/sentinel/ports";
import type { Observation } from "../agents/sentinel/policy";

const HINT = "¿Ejecutaste supabase/migrations/0006_agentes.sql?";

type ThreatRow = {
  domain: string;
  level: ThreatDomain["level"];
  dangerous_reports: number;
  suspicious_reports: number;
  affected_users: number;
  priority: number | string;
  reason: string;
  active: boolean;
  first_seen_at: string;
  last_seen_at: string;
};

const toThreat = (row: ThreatRow): ThreatDomain => ({
  domain: row.domain,
  level: row.level,
  dangerousReports: row.dangerous_reports,
  suspiciousReports: row.suspicious_reports,
  affectedUsers: row.affected_users,
  priority: Number(row.priority),
  reason: row.reason,
  active: row.active,
  firstSeenAt: new Date(row.first_seen_at).toISOString(),
  lastSeenAt: new Date(row.last_seen_at).toISOString(),
});

type RunRow = {
  id: string;
  agent: string;
  trigger: AgentRun["trigger"];
  status: AgentRun["status"];
  started_at: string;
  finished_at: string;
  perceived: unknown;
  decisions: unknown;
  actions: unknown;
  summary: string;
};

function toRun(row: RunRow): AgentRun | null {
  const parsed = agentRunSchema.safeParse({
    id: row.id,
    agent: row.agent,
    trigger: row.trigger,
    status: row.status,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: new Date(row.finished_at).toISOString(),
    perceived: row.perceived,
    decisions: row.decisions,
    actions: row.actions,
    summary: row.summary,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Sensores y actuadores del Centinela. Usa la clave SECRETA de Supabase
 * (rol service_role): las funciones SQL que lee y escribe solo están
 * concedidas a ese rol, y devuelven conteos agregados por dominio.
 */
export function createSupabaseSentinelRepository(
  config: { url: string; secretKey: string },
  logger: Logger,
): SentinelRepository {
  const db: SupabaseClient = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fail = (event: string, message: string): never => {
    logger.error(event, { message, hint: HINT });
    throw new Error(`Centinela: ${message}`);
  };

  return {
    async observe(since) {
      const { data, error } = await db.rpc("sentinel_observations", {
        p_since: since.toISOString(),
      });
      if (error) return fail("sentinel_observe_failed", error.message);
      return (
        (data ?? []) as Array<{
          domain: string;
          dangerous_reports: number;
          suspicious_reports: number;
          safe_reports: number;
          affected_users: number;
          last_seen_at: string;
        }>
      ).map((row): Observation => ({
        domain: row.domain,
        dangerousReports: row.dangerous_reports,
        suspiciousReports: row.suspicious_reports,
        safeReports: row.safe_reports,
        affectedUsers: row.affected_users,
        lastSeenAt: new Date(row.last_seen_at).toISOString(),
      }));
    },

    async listThreats({ activeOnly = false, limit = 500 } = {}) {
      let query = db
        .from("threat_domains")
        .select("*")
        .order("priority", { ascending: false })
        .limit(limit);
      if (activeOnly) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) return fail("sentinel_threats_failed", error.message);
      return (data as ThreatRow[]).map(toThreat);
    },

    async upsertThreat(threat) {
      const { error } = await db.from("threat_domains").upsert({
        domain: threat.domain,
        level: threat.level,
        dangerous_reports: threat.dangerousReports,
        suspicious_reports: threat.suspiciousReports,
        affected_users: threat.affectedUsers,
        priority: threat.priority,
        reason: threat.reason,
        active: threat.active,
        first_seen_at: threat.firstSeenAt,
        last_seen_at: threat.lastSeenAt,
        updated_at: new Date().toISOString(),
      });
      if (error) fail("sentinel_upsert_failed", error.message);
    },

    async retireThreat(domain) {
      const { error } = await db
        .from("threat_domains")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("domain", domain);
      if (error) fail("sentinel_retire_failed", error.message);
    },

    async alertExposedUsers({ domain, level, runId, title, message }) {
      const { data, error } = await db.rpc("sentinel_alert_exposed_users", {
        p_domain: domain,
        p_level: level,
        p_run_id: runId,
        p_title: title,
        p_message: message,
      });
      if (error) return fail("sentinel_alert_failed", error.message);
      return typeof data === "number" ? data : 0;
    },

    async saveRun(run) {
      const { error } = await db.from("agent_runs").insert({
        id: run.id,
        agent: run.agent,
        trigger: run.trigger,
        status: run.status,
        started_at: run.startedAt,
        finished_at: run.finishedAt,
        perceived: run.perceived,
        decisions: run.decisions,
        actions: run.actions,
        summary: run.summary,
      });
      if (error) fail("sentinel_save_run_failed", error.message);
    },

    async listRuns(limit) {
      const { data, error } = await db
        .from("agent_runs")
        .select("*")
        .eq("agent", "sentinel")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) return fail("sentinel_runs_failed", error.message);
      return (data as RunRow[])
        .map(toRun)
        .filter((r): r is AgentRun => r !== null);
    },
  };
}

/** Alertas del usuario con su propio JWT: RLS garantiza que solo ve las suyas. */
export function createSupabaseAlertRepository(
  db: SupabaseClient,
  userId: string,
): AlertRepository {
  return {
    async list(limit) {
      const { data, error } = await db
        .from("agent_alerts")
        .select("id, domain, level, title, message, created_at, read_at")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      // Sin la migración 0006 la tabla no existe: el panel sigue funcionando.
      if (error) return [];
      return (
        data as Array<{
          id: string;
          domain: string;
          level: AgentAlert["level"];
          title: string;
          message: string;
          created_at: string;
          read_at: string | null;
        }>
      ).map((row) => ({
        id: row.id,
        domain: row.domain,
        level: row.level,
        title: row.title,
        message: row.message,
        createdAt: new Date(row.created_at).toISOString(),
        readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      }));
    },
    async markAllRead() {
      const { data, error } = await db
        .from("agent_alerts")
        .update({ read_at: new Date().toISOString() })
        .eq("profile_id", userId)
        .is("read_at", null)
        .select("id");
      if (error) throw new Error("No se pudieron marcar las alertas.");
      return data?.length ?? 0;
    },
  };
}
