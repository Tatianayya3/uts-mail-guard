import { Radar } from "lucide-react";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import type { SignalBreakdown } from "./dashboard.utils";

const SEGMENTS = [
  { key: "fail", label: "Fallo", color: "#ff5c5c" },
  { key: "warning", label: "Advertencia", color: "#fbbf24" },
  { key: "pass", label: "Correcto", color: "#4edea3" },
] as const;

/** Qué parte del correo delata más al phishing: remitente, contenido o enlaces. */
export default function SignalBreakdownCard({
  signals,
}: {
  signals: SignalBreakdown[];
}) {
  const hasData = signals.some((s) => s.fail + s.warning + s.pass > 0);
  return (
    <ChartCard
      title="¿Qué delata a los correos?"
      subtitle="Resultado de cada señal en el periodo"
    >
      {!hasData ? (
        <EmptyChartState
          icon={Radar}
          title="Sin señales"
          description="Las señales de tus análisis aparecerán aquí."
          className="h-48"
        />
      ) : (
        <div className="flex flex-col gap-5">
          {signals.map((signal) => {
            const total = signal.fail + signal.warning + signal.pass || 1;
            return (
              <div key={signal.key}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-white">{signal.label}</span>
                  <span className="text-xs text-guard-text-muted">
                    <span className="text-base font-bold text-white tabular-nums">
                      {signal.alertRate}%
                    </span>{" "}
                    con alertas
                  </span>
                </div>
                <div
                  className="flex h-2.5 overflow-hidden rounded-full bg-white/5"
                  role="img"
                  aria-label={`${signal.label}: ${signal.fail} fallos, ${signal.warning} advertencias, ${signal.pass} correctos`}
                >
                  {SEGMENTS.map(({ key, color }) => (
                    <div
                      key={key}
                      className="h-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${(signal[key] / total) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <ul className="flex gap-4 text-[11px] text-guard-text-muted">
            {SEGMENTS.map(({ key, label, color }) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />{" "}
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
