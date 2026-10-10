import { useState } from "react";
import {
  VERDICT_COLOR,
  VERDICT_LABEL,
  type ScanRecord,
} from "@mail-guard/contracts";

type Props = { scans: ScanRecord[]; averageScore: number };

const MAX_BARS = 12;

export default function SecurityPulseChart({ scans, averageScore }: Props) {
  const [hovered, setHovered] = useState<ScanRecord | null>(null);
  // Llegan del más reciente al más antiguo; se pintan de izquierda (antiguo) a derecha.
  const bars = scans.slice(0, MAX_BARS).reverse();
  const hasScans = bars.length > 0;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-guard-accent">
            Pulso de seguridad
          </p>
          <p className="text-xs text-guard-text-muted">
            {hasScans
              ? bars.length === 1
                ? "Último correo analizado"
                : `Últimos ${bars.length} correos analizados`
              : "Historial de confianza"}
          </p>
        </div>
        {hasScans && (
          <span className="text-xs font-semibold text-white">
            {averageScore}% prom.
          </span>
        )}
      </div>

      <div className="flex h-12 items-center justify-between rounded-xl border border-white/5 bg-white/[0.04] px-3 text-xs">
        {hovered ? (
          <>
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate font-semibold text-white">
                {hovered.subject || "Correo analizado"}
              </p>
              <p className="truncate text-[10px] text-guard-text-muted">
                {hovered.sender.domain}
              </p>
            </div>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: `${VERDICT_COLOR[hovered.verdict]}22`,
                color: VERDICT_COLOR[hovered.verdict],
              }}
            >
              {VERDICT_LABEL[hovered.verdict]} · {hovered.trustScore}%
            </span>
          </>
        ) : (
          <p className="truncate text-[11px] text-guard-text-muted">
            {hasScans
              ? "Pasa el cursor sobre una barra para ver el detalle"
              : "Analiza un correo para empezar tu historial"}
          </p>
        )}
      </div>

      <div
        className="flex h-16 items-end gap-1.5"
        onMouseLeave={() => setHovered(null)}
      >
        {hasScans
          ? bars.map((scan) => (
              <button
                key={scan.id}
                type="button"
                aria-label={`${scan.subject || "Correo sin asunto"}: ${VERDICT_LABEL[scan.verdict]}, ${scan.trustScore}%`}
                onMouseEnter={() => setHovered(scan)}
                onFocus={() => setHovered(scan)}
                className="flex h-full flex-1 cursor-pointer flex-col justify-end focus-visible:outline-1 focus-visible:outline-guard-accent"
              >
                <span
                  className={`block w-full rounded-t transition-all duration-200 ${hovered?.id === scan.id ? "brightness-125" : "opacity-90"}`}
                  style={{
                    height: `${Math.max(12, scan.trustScore)}%`,
                    backgroundColor: VERDICT_COLOR[scan.verdict],
                  }}
                />
              </button>
            ))
          : Array.from({ length: MAX_BARS }, (_, i) => (
              <span
                key={i}
                className="block flex-1 rounded-t bg-white/5"
                style={{ height: `${30 + ((i * 37) % 60)}%` }}
              />
            ))}
      </div>
    </section>
  );
}
