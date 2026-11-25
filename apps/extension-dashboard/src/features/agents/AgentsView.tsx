import {
  BellOff,
  Bot,
  Brain,
  Eye,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  AgentAlert,
  AgentRun,
  AgentsOverview,
  ThreatDomain,
} from "@mail-guard/contracts";
import { cn } from "@mail-guard/ui";
import ChartCard from "@/features/dashboard/ChartCard";
import EmptyChartState from "@/features/dashboard/EmptyChartState";
import {
  formatFullDate,
  formatRelativeTime,
} from "@/features/dashboard/dashboard.utils";
import { MarkAlertsReadButton } from "./AgentButtons";
import {
  ACTION_LABEL,
  AGENTS,
  DECISION_LABEL,
  TRIGGER_LABEL,
  type AgentProfile,
} from "./agents.constants";

const LEVEL_CLASS = {
  dangerous: "border-red-400/30 bg-red-400/10 text-red-200",
  suspicious: "border-amber-300/30 bg-amber-300/10 text-amber-100",
} as const;
const LEVEL_LABEL = { dangerous: "Peligroso", suspicious: "Sospechoso" };

function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        className ?? "border-white/10 bg-white/5 text-guard-text-muted",
      )}
    >
      {children}
    </span>
  );
}

function Time({ iso }: { iso: string }) {
  return (
    <span title={formatFullDate(iso)} suppressHydrationWarning>
      {formatRelativeTime(iso)}
    </span>
  );
}

function AgentCard({
  agent,
  status,
}: {
  agent: AgentProfile;
  status: { tone: "on" | "off"; text: string };
}) {
  const Icon = agent.id === "analyst" ? ScanSearch : Bot;
  return (
    <section className="flex flex-col rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-guard-accent/10 text-guard-accent">
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-white">{agent.name}</h2>
            <Pill
              className={
                status.tone === "on"
                  ? "border-guard-success/30 bg-guard-success-strong/15 text-guard-success"
                  : undefined
              }
            >
              {status.text}
            </Pill>
          </div>
          <p className="mt-1 text-sm text-guard-text-muted">{agent.role}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-guard-text-muted">
            Clasificación
          </dt>
          <dd className="mt-0.5 font-semibold text-guard-accent">
            {agent.classification}
          </dd>
          <dd className="mt-1 text-xs leading-relaxed text-guard-text-muted">
            {agent.why}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-guard-text-muted">Modo</dt>
          <dd className="mt-0.5 text-white">{agent.mode}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full text-left text-xs">
        <caption className="mb-2 text-left text-xs font-medium text-guard-text-muted">
          PEAS
        </caption>
        <tbody>
          {agent.peas.map((row) => (
            <tr key={row.label} className="border-t border-white/5 align-top">
              <th className="w-28 py-2 pr-3 font-semibold text-white">
                {row.label}
              </th>
              <td className="py-2 text-guard-text-muted">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CycleStep({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-guard-accent">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </p>
      {children}
    </div>
  );
}

function LastCycle({ run }: { run: AgentRun | null }) {
  if (!run) {
    return (
      <ChartCard
        title="Último ciclo del Centinela"
        subtitle="Percibir → deliberar → actuar"
      >
        <EmptyChartState
          icon={Bot}
          className="h-40"
          title="Aún no ha corrido"
          description="Pulsa «Ejecutar Centinela» o espera su próximo ciclo automático."
        />
      </ChartCard>
    );
  }
  const shown = run.decisions.slice(0, 6);
  return (
    <ChartCard
      title="Último ciclo del Centinela"
      subtitle="Percibir → deliberar → actuar"
      action={
        <span className="flex items-center gap-2 text-xs text-guard-text-muted">
          <Pill>{TRIGGER_LABEL[run.trigger]}</Pill>
          <Time iso={run.finishedAt} />
        </span>
      }
    >
      <p
        className={cn(
          "mb-4 text-sm",
          run.status === "failed" ? "text-red-200" : "text-white",
        )}
      >
        {run.summary}
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        <CycleStep icon={Eye} title="1 · Percepción">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Análisis", run.perceived.scansObserved],
              ["Dominios", run.perceived.domainsObserved],
              ["Amenazas conocidas", run.perceived.knownThreats],
              ["Ventana", `${run.perceived.windowDays} días`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-guard-text-muted">{label}</dt>
                <dd className="text-lg font-bold tabular-nums text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CycleStep>
        <CycleStep icon={Brain} title="2 · Deliberación">
          {shown.length === 0 ? (
            <p className="text-xs text-guard-text-muted">
              Ningún dominio alcanzó los umbrales: no hay nada que decidir.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-xs">
              {shown.map((d) => (
                <li key={`${d.domain}-${d.decision}`}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Pill
                      className={
                        d.decision === "ignore"
                          ? undefined
                          : d.level
                            ? LEVEL_CLASS[d.level]
                            : undefined
                      }
                    >
                      {DECISION_LABEL[d.decision]}
                    </Pill>
                    <span className="truncate font-semibold text-white">
                      {d.domain}
                    </span>
                    <span className="text-guard-text-muted">
                      · prioridad {d.priority}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-guard-text-muted">
                    {d.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CycleStep>
        <CycleStep icon={Zap} title="3 · Acción">
          {run.actions.length === 0 ? (
            <p className="text-xs text-guard-text-muted">
              Sin acciones en este ciclo.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-xs">
              {run.actions.map((a, i) => (
                <li key={`${a.domain}-${a.type}-${i}`}>
                  <span className="font-semibold text-white">
                    {ACTION_LABEL[a.type]}
                  </span>
                  <span className="text-guard-text-muted"> · {a.domain}</span>
                  <span className="mt-0.5 block text-guard-text-muted">
                    {a.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CycleStep>
      </div>
    </ChartCard>
  );
}

function ThreatsCard({ threats }: { threats: ThreatDomain[] }) {
  return (
    <ChartCard
      title="Base de conocimiento"
      subtitle="Dominios que el Centinela publicó y el Analista consulta"
    >
      {threats.length === 0 ? (
        <EmptyChartState
          icon={ShieldCheck}
          className="h-40"
          title="Sin campañas activas"
          description="Cuando varios análisis señalen un mismo dominio, aparecerá aquí."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-guard-text-muted">
              <tr>
                <th className="pb-2 font-medium">Dominio</th>
                <th className="pb-2 font-medium">Nivel</th>
                <th className="pb-2 text-right font-medium">Reportes</th>
                <th className="pb-2 text-right font-medium">Usuarios</th>
                <th className="pb-2 text-right font-medium">Último</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t) => (
                <tr key={t.domain} className="border-t border-white/5">
                  <td className="py-2 pr-3 font-semibold text-white">
                    {t.domain}
                  </td>
                  <td className="py-2 pr-3">
                    <Pill className={LEVEL_CLASS[t.level]}>
                      {LEVEL_LABEL[t.level]}
                    </Pill>
                  </td>
                  <td className="py-2 text-right tabular-nums text-white">
                    {t.dangerousReports + t.suspiciousReports}
                  </td>
                  <td className="py-2 text-right tabular-nums text-white">
                    {t.affectedUsers}
                  </td>
                  <td className="py-2 text-right text-guard-text-muted">
                    <Time iso={t.lastSeenAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function AlertsCard({ alerts }: { alerts: AgentAlert[] }) {
  const unread = alerts.filter((a) => !a.readAt).length;
  return (
    <ChartCard
      title="Tus alertas"
      subtitle={
        unread
          ? `${unread} sin leer`
          : "Avisos del Centinela sobre correos que recibiste"
      }
      action={unread > 0 ? <MarkAlertsReadButton /> : undefined}
    >
      {alerts.length === 0 ? (
        <EmptyChartState
          icon={BellOff}
          className="h-40"
          title="Sin alertas"
          description="Ninguna campaña detectada te ha enviado correos."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-xl border p-3",
                a.readAt
                  ? "border-white/5 bg-white/[0.02]"
                  : LEVEL_CLASS[a.level],
              )}
            >
              <p className="flex items-center gap-2 text-xs font-semibold text-white">
                {a.level === "dangerous" ? (
                  <Siren className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldAlert
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                <span className="shrink-0 font-normal text-guard-text-muted">
                  <Time iso={a.createdAt} />
                </span>
              </p>
              <p className="mt-1 text-xs text-guard-text-muted">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

function RunsCard({ runs }: { runs: AgentRun[] }) {
  return (
    <ChartCard title="Bitácora" subtitle="Últimos ciclos del Centinela">
      {runs.length === 0 ? (
        <EmptyChartState
          icon={Bot}
          className="h-40"
          title="Sin ciclos registrados"
          description="Cada ejecución queda registrada aquí."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {runs.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-xs"
            >
              <Pill
                className={
                  r.status === "failed" ? LEVEL_CLASS.dangerous : undefined
                }
              >
                {TRIGGER_LABEL[r.trigger]}
              </Pill>
              <span className="min-w-0 flex-1 text-guard-text-muted">
                {r.summary}
              </span>
              <span className="shrink-0 text-guard-text-muted">
                <Time iso={r.finishedAt} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

/** Página de agentes: quiénes son, qué percibieron, qué decidieron y qué hicieron. */
export default function AgentsView({
  agents,
}: {
  agents: AgentsOverview | null;
}) {
  const sentinel = agents?.sentinel;
  const [analyst, sentinelProfile] = AGENTS as [AgentProfile, AgentProfile];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AgentCard
          agent={analyst}
          status={{ tone: "on", text: "Activo · siempre disponible" }}
        />
        <AgentCard
          agent={sentinelProfile}
          status={
            sentinel?.enabled
              ? {
                  tone: "on",
                  text: `Activo · cada ${sentinel.intervalMinutes} min`,
                }
              : { tone: "off", text: "Sin configurar" }
          }
        />
      </div>

      {sentinel && !sentinel.enabled && (
        <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          El Centinela está desactivado: agrega <code>SUPABASE_SECRET_KEY</code>{" "}
          al history-service y ejecuta la migración{" "}
          <code>0006_agentes.sql</code> en Supabase.
        </p>
      )}

      <LastCycle run={sentinel?.lastRun ?? null} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ThreatsCard threats={agents?.threats ?? []} />
        <AlertsCard alerts={agents?.alerts ?? []} />
      </div>

      <RunsCard runs={agents?.runs ?? []} />
    </div>
  );
}
