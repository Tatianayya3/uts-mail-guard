import type { Hono, MiddlewareHandler } from "hono";
import type { AgentsOverview } from "@mail-guard/contracts";
import { unavailable } from "@mail-guard/service-kit";
import type { SentinelRepository } from "../agents/sentinel/ports";
import type { Sentinel } from "../agents/sentinel/sentinel";
import type { HistoryEnv } from "./routes";

export type AgentDeps = {
  sentinel: Sentinel | null;
  repo: SentinelRepository | null;
  intervalMinutes: number;
};

const THREATS_IN_PANEL = 50;
const RUNS_IN_PANEL = 10;
const ALERTS_IN_PANEL = 20;

const notConfigured = () =>
  unavailable(
    "El agente Centinela no está configurado (falta SUPABASE_SECRET_KEY).",
  );

/**
 * Rutas de los agentes. Todas viven bajo /v1 (token interno obligatorio).
 * - GET  /agents/threats       → feed de amenazas para el Analista (solo interno).
 * - GET  /agents               → estado, amenazas, alertas propias y bitácora.
 * - POST /agents/sentinel/run  → ejecución semiautomática del Centinela.
 * - POST /agents/alerts/read   → marca las alertas propias como leídas.
 */
export function registerAgentRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- basePath("/v1") de Hono
  v1: Hono<any, any, any>,
  authenticate: MiddlewareHandler<HistoryEnv>,
  deps: AgentDeps,
) {
  v1.get("/agents/threats", async (c) => {
    if (!deps.repo) return c.json({ threats: [] });
    const threats = await deps.repo
      .listThreats({ activeOnly: true, limit: 1_000 })
      .catch(() => []);
    return c.json({
      threats: threats.map((t) => ({
        domain: t.domain,
        level: t.level,
        reports: t.dangerousReports + t.suspiciousReports,
      })),
    });
  });

  v1.get("/agents", authenticate, async (c) => {
    const alerts = c.var.alerts
      ? await c.var.alerts.list(ALERTS_IN_PANEL).catch(() => [])
      : [];
    const [threats, runs] = deps.repo
      ? await Promise.all([
          deps.repo
            .listThreats({ activeOnly: true, limit: THREATS_IN_PANEL })
            .catch(() => []),
          deps.repo.listRuns(RUNS_IN_PANEL).catch(() => []),
        ])
      : [[], []];
    const overview: AgentsOverview = {
      sentinel: {
        enabled: Boolean(deps.sentinel),
        intervalMinutes: deps.intervalMinutes,
        lastRun: deps.sentinel?.lastRun ?? runs[0] ?? null,
      },
      threats,
      alerts,
      runs,
    };
    return c.json(overview);
  });

  v1.post("/agents/sentinel/run", authenticate, async (c) => {
    if (!deps.sentinel) throw notConfigured();
    return c.json({ run: await deps.sentinel.run("manual") });
  });

  v1.post("/agents/alerts/read", authenticate, async (c) => {
    const updated = c.var.alerts ? await c.var.alerts.markAllRead() : 0;
    return c.json({ updated });
  });
}
