import type {
  AgentRun,
  AgentTrigger,
  SentinelAction,
  SentinelDecision,
  ThreatDomain,
} from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import {
  actionable,
  deliberate,
  DEFAULT_POLICY,
  type Observation,
  type SentinelPolicy,
} from "./policy";
import type { SentinelRepository } from "./ports";

type Deps = {
  repo: SentinelRepository;
  logger: Logger;
  policy?: SentinelPolicy;
  now?: () => Date;
  newId?: () => string;
  /** Una ejecución manual dentro de este margen devuelve la última (evita spam). */
  manualCooldownMs?: number;
};

export type Sentinel = ReturnType<typeof createSentinel>;

/**
 * Agente Centinela · ciclo de vida: PERCIBIR → DELIBERAR → ACTUAR → RECORDAR.
 * Nunca corre dos ciclos a la vez: si ya hay uno en curso, se reutiliza.
 */
export function createSentinel({
  repo,
  logger,
  policy = DEFAULT_POLICY,
  now = () => new Date(),
  newId = () => crypto.randomUUID(),
  manualCooldownMs = 15_000,
}: Deps) {
  let running: Promise<AgentRun> | null = null;
  let last: AgentRun | null = null;

  async function cycle(trigger: AgentTrigger): Promise<AgentRun> {
    const startedAt = now();
    const id = newId();
    const perceived = {
      windowDays: policy.windowDays,
      scansObserved: 0,
      domainsObserved: 0,
      knownThreats: 0,
    };
    let decisions: SentinelDecision[] = [];
    const actions: SentinelAction[] = [];

    try {
      // 1. PERCIBIR: análisis agregados de la ventana + creencias actuales.
      const since = new Date(
        startedAt.getTime() - policy.windowDays * 86_400_000,
      );
      const [observations, known] = await Promise.all([
        repo.observe(since),
        repo.listThreats(),
      ]);
      perceived.domainsObserved = observations.length;
      perceived.scansObserved = observations.reduce(
        (sum, o) =>
          sum + o.dangerousReports + o.suspiciousReports + o.safeReports,
        0,
      );
      perceived.knownThreats = known.filter((t) => t.active).length;

      // 2. DELIBERAR: qué dominios publicar, escalar, refrescar o retirar.
      decisions = deliberate(observations, known, startedAt, policy);

      // 3. ACTUAR sobre las decisiones de mayor prioridad.
      const byDomain = new Map(
        observations.map((o) => [o.domain.toLowerCase(), o]),
      );
      const beliefs = new Map(known.map((t) => [t.domain, t]));
      for (const decision of actionable(decisions, policy)) {
        await act(
          decision,
          byDomain.get(decision.domain),
          beliefs.get(decision.domain),
          id,
          actions,
          startedAt,
        );
      }

      return finish({
        id,
        trigger,
        status: "completed",
        startedAt,
        perceived,
        decisions,
        actions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("sentinel_run_failed", { trigger, message });
      return finish({
        id,
        trigger,
        status: "failed",
        startedAt,
        perceived,
        decisions,
        actions,
        failure: message,
      });
    }
  }

  async function act(
    decision: SentinelDecision,
    observation: Observation | undefined,
    belief: ThreatDomain | undefined,
    runId: string,
    actions: SentinelAction[],
    at: Date,
  ) {
    const { domain } = decision;

    if (decision.decision === "retire") {
      await repo.retireThreat(domain);
      actions.push({ type: "retire_threat", domain, detail: decision.reason });
      return;
    }
    if (!observation || !decision.level) return;

    await repo.upsertThreat({
      domain,
      level: decision.level,
      dangerousReports: observation.dangerousReports,
      suspiciousReports: observation.suspiciousReports,
      affectedUsers: observation.affectedUsers,
      priority: decision.priority,
      reason: decision.reason,
      active: true,
      firstSeenAt: belief?.active ? belief.firstSeenAt : at.toISOString(),
      lastSeenAt: observation.lastSeenAt,
    });
    actions.push({
      type: decision.decision === "flag" ? "add_threat" : "update_threat",
      domain,
      detail:
        decision.decision === "flag"
          ? `Publicado como ${decision.level === "dangerous" ? "peligroso" : "sospechoso"} en la base de conocimiento.`
          : decision.decision === "escalate"
            ? "Nivel elevado a peligroso."
            : "Conteos actualizados.",
    });

    // Solo una detección o una escalada justifican avisar (refrescar no).
    if (decision.decision === "refresh") return;
    const dangerous = decision.level === "dangerous";
    const alerted = await repo.alertExposedUsers({
      domain,
      level: decision.level,
      runId,
      title: dangerous
        ? `Campaña de phishing activa: ${domain}`
        : `Dominio sospechoso: ${domain}`,
      message: dangerous
        ? `Varios usuarios de Mail Guard recibieron correos peligrosos de ${domain}. No abras sus enlaces ni respondas; si ya lo hiciste, cambia tus contraseñas.`
        : `${domain} acumula reportes sospechosos. Revisa con cuidado cualquier correo que venga de este dominio.`,
    });
    if (alerted > 0) {
      actions.push({
        type: "alert_users",
        domain,
        detail: `${alerted} ${alerted === 1 ? "usuario avisado" : "usuarios avisados"}.`,
      });
    }
  }

  async function finish(input: {
    id: string;
    trigger: AgentTrigger;
    status: AgentRun["status"];
    startedAt: Date;
    perceived: AgentRun["perceived"];
    decisions: SentinelDecision[];
    actions: SentinelAction[];
    failure?: string;
  }): Promise<AgentRun> {
    const run: AgentRun = {
      id: input.id,
      agent: "sentinel",
      trigger: input.trigger,
      status: input.status,
      startedAt: input.startedAt.toISOString(),
      finishedAt: now().toISOString(),
      perceived: input.perceived,
      decisions: input.decisions.slice(0, 50),
      actions: input.actions,
      summary: summarize(input).slice(0, 500),
    };
    // 4. RECORDAR: la bitácora explica cada ciclo en el panel.
    try {
      await repo.saveRun(run);
    } catch (error) {
      logger.warn("sentinel_run_not_saved", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    last = run;
    logger.info("sentinel_run", {
      trigger: run.trigger,
      status: run.status,
      decisions: run.decisions.length,
      actions: run.actions.length,
    });
    return run;
  }

  return {
    /** Ejecuta un ciclo. `manual` = semiautomático (lo pide el usuario). */
    run(trigger: AgentTrigger): Promise<AgentRun> {
      if (running) return running;
      if (
        trigger === "manual" &&
        last &&
        now().getTime() - new Date(last.finishedAt).getTime() < manualCooldownMs
      ) {
        return Promise.resolve(last);
      }
      running = cycle(trigger).finally(() => {
        running = null;
      });
      return running;
    },
    get lastRun() {
      return last;
    },
    get policy() {
      return policy;
    },
  };
}

function summarize(input: {
  status: AgentRun["status"];
  perceived: AgentRun["perceived"];
  decisions: SentinelDecision[];
  actions: SentinelAction[];
  failure?: string;
}): string {
  if (input.status === "failed")
    return `El ciclo falló: ${input.failure ?? "error desconocido"}.`;
  const { domainsObserved, scansObserved } = input.perceived;
  const count = (type: SentinelAction["type"]) =>
    input.actions.filter((a) => a.type === type).length;
  const added = count("add_threat");
  const updated = count("update_threat");
  const retired = count("retire_threat");
  const alerted = input.actions
    .filter((a) => a.type === "alert_users")
    .reduce((sum, a) => sum + (Number.parseInt(a.detail, 10) || 0), 0);
  const ignored = input.decisions.filter((d) => d.decision === "ignore").length;

  const parts = [
    `Observó ${scansObserved} análisis de ${domainsObserved} dominios.`,
  ];
  if (!input.actions.length) {
    parts.push("No encontró campañas nuevas: no hizo falta actuar.");
  } else {
    if (added) parts.push(`Publicó ${added} dominio(s) nuevos como amenaza.`);
    if (updated) parts.push(`Actualizó ${updated}.`);
    if (retired) parts.push(`Retiró ${retired} sin actividad.`);
    if (alerted) parts.push(`Avisó a ${alerted} usuario(s) expuestos.`);
  }
  if (ignored)
    parts.push(`Descartó ${ignored} por reputación o proveedor masivo.`);
  return parts.join(" ");
}
