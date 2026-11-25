"use client";

import { Power, RefreshCw } from "lucide-react";
import { cn } from "@mail-guard/ui";
import {
  useServiceStatus,
  type ServiceName,
  type WakePhase,
} from "./useServiceStatus";

const SERVICES: { key: ServiceName; label: string }[] = [
  { key: "gateway", label: "Gateway" },
  { key: "analysis", label: "Análisis" },
  { key: "history", label: "Historial" },
];

const PHASE_TEXT: Record<WakePhase, string> = {
  checking: "Revisando…",
  waking: "Despertando (hasta ~1 min)…",
  ready: "Todo en línea",
  failed: "No respondieron",
};

function Dot({ state }: { state: "ok" | "down" | "pending" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        state === "ok" &&
          "bg-guard-success shadow-[0_0_8px_rgba(16,185,129,0.6)]",
        state === "down" && "animate-pulse bg-amber-300",
        state === "pending" && "animate-pulse bg-white/30",
      )}
    />
  );
}

/**
 * Estado de los microservicios con botón para despertarlos. En el plan free
 * de Render se duermen tras 15 min sin tráfico; al abrir el panel se
 * despiertan solos, y el botón permite repetirlo antes de una demo.
 */
export default function ServiceStatus({
  variant = "card",
}: {
  variant?: "card" | "compact";
}) {
  const { health, phase, wake } = useServiceStatus();
  const busy = phase === "checking" || phase === "waking";
  const stateOf = (key: ServiceName) =>
    health ? health[key] : ("pending" as const);

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => void wake()}
        disabled={busy}
        title={PHASE_TEXT[phase]}
        aria-label={`Servicios: ${PHASE_TEXT[phase]}. Pulsa para despertarlos.`}
        className="flex items-center gap-1.5 rounded-xl border border-guard-surface-raised bg-guard-surface-card/60 px-3 py-2 disabled:cursor-wait"
      >
        {SERVICES.map((s) => (
          <Dot key={s.key} state={stateOf(s.key)} />
        ))}
      </button>
    );
  }

  return (
    <section
      aria-label="Estado de los servicios"
      className="rounded-xl border border-guard-surface-raised bg-guard-surface-card/60 p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-guard-text-muted">
          Servicios
        </p>
        <span
          className={cn(
            "text-[11px] font-medium",
            phase === "ready" ? "text-guard-success" : "text-amber-200",
          )}
          role="status"
        >
          {PHASE_TEXT[phase]}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {SERVICES.map((s) => (
          <li
            key={s.key}
            className="flex items-center gap-2 text-xs text-white"
          >
            <Dot state={stateOf(s.key)} />
            {s.label}
          </li>
        ))}
      </ul>
      {health?.engine && (
        <p className="mt-2 truncate text-[11px] text-guard-text-muted">
          Motor: {health.engine}
        </p>
      )}
      <button
        type="button"
        onClick={() => void wake()}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs font-semibold text-guard-text-muted transition-colors hover:border-guard-accent/30 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Power className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {busy ? "Despertando…" : "Despertar servicios"}
      </button>
    </section>
  );
}
