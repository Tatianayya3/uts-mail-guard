import { useState } from "react";
import type { MailScanSummary } from "@mail-guard/supabase";

type SecurityPulseChartProps = {
  scans: MailScanSummary[];
  averageScore?: number;
};

export default function SecurityPulseChart({
  scans,
  averageScore = 100,
}: SecurityPulseChartProps) {
  const [hoveredScan, setHoveredScan] = useState<MailScanSummary | null>(null);

  // We show up to the last 12 scans (oldest to newest for chronological left-to-right pulse)
  const displayScans = [...scans].reverse().slice(-12);
  const hasScans = displayScans.length > 0;

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "safe":
        return "#4edea3";
      case "suspicious":
        return "#fbbf24";
      case "dangerous":
        return "#ff5c5c";
      default:
        return "#a3a3a3";
    }
  };

  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case "safe":
        return "Seguro";
      case "suspicious":
        return "Sospechoso";
      case "dangerous":
        return "Peligroso";
      default:
        return "Sin determinar";
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-guard-accent">
            PULSO DE SEGURIDAD
          </p>
          <p className="text-xs text-guard-text-muted">
            {hasScans
              ? `Últimos ${displayScans.length} correos analizados`
              : "Historial de confianza"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              averageScore >= 80
                ? "bg-guard-success shadow-[0_0_8px_rgba(78,222,163,0.7)]"
                : averageScore >= 50
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                  : "bg-red-500 shadow-[0_0_8px_rgba(255,92,92,0.7)]"
            }`}
          />
          <span className="text-xs font-semibold text-white">
            {hasScans ? `${Math.round(averageScore)}% prom.` : "Óptimo"}
          </span>
        </div>
      </div>

      {/* Dynamic Hover/Detail Banner */}
      {hoveredScan ? (
        <div className="flex items-center justify-between rounded-xl bg-guard-surface-raised/90 px-3 py-2 text-xs transition-all">
          <div className="min-w-0 pr-2">
            <p className="truncate font-semibold text-white">
              {hoveredScan.subject || "Correo analizado"}
            </p>
            <p className="truncate text-[10px] text-guard-text-muted">
              {hoveredScan.sender_domain ||
                hoveredScan.sender_email ||
                "Remitente"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: `${getVerdictColor(hoveredScan.verdict)}22`,
                color: getVerdictColor(hoveredScan.verdict),
              }}
            >
              {getVerdictLabel(hoveredScan.verdict)}
            </span>
            <span className="text-xs font-black text-white">
              {hoveredScan.trust_score}%
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
          <span className="text-[10px] text-guard-text-muted">
            {hasScans
              ? "Pasa el cursor sobre una barra para ver detalles"
              : "Sin análisis registrados"}
          </span>
          <span className="text-[10px] font-medium text-guard-accent">
            {hasScans ? "Monitoreo en vivo" : "Listo para escanear"}
          </span>
        </div>
      )}

      {/* Bar Chart */}
      <div className="flex h-16 items-end gap-1.5 pt-2">
        {hasScans
          ? displayScans.map((scan, index) => {
              const barHeight = Math.max(12, scan.trust_score);
              const color = getVerdictColor(scan.verdict);
              const isHovered = hoveredScan?.id === scan.id;

              return (
                <div
                  key={scan.id || index}
                  className="group relative flex h-full flex-1 cursor-pointer flex-col justify-end items-center"
                  onMouseEnter={() => setHoveredScan(scan)}
                  onMouseLeave={() => setHoveredScan(null)}
                >
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isHovered
                        ? "scale-y-105 brightness-125"
                        : "hover:brightness-110"
                    }`}
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: color,
                      boxShadow: isHovered ? `0 0 10px ${color}88` : undefined,
                    }}
                  />
                </div>
              );
            })
          : /* Empty / Standby Placeholder Bars */
            [40, 60, 50, 75, 65, 85, 70, 95, 80, 100, 90, 95].map((h, i) => (
              <div
                key={i}
                className="flex h-full flex-1 flex-col justify-end items-center opacity-25"
              >
                <div
                  className="w-full rounded-t bg-guard-accent/40"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] text-guard-text-muted">
        <span>{hasScans ? "Anteriores" : "Esperando escaneos"}</span>
        <span>{hasScans ? "Más reciente" : "Detección activa"}</span>
      </div>
    </section>
  );
}
