"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import { WEEKDAY_LABELS, type HeatCell } from "./dashboard.utils";

const HOUR_TICKS = [0, 6, 12, 18, 23];

function cellStyle(cell: HeatCell, max: number) {
  if (cell.total === 0) return { backgroundColor: "rgba(255,255,255,0.04)" };
  const intensity = 0.25 + 0.75 * (cell.total / max);
  // Rojo si la mayoría de lo que llegó a esa hora tenía alertas; lima si no.
  const color = cell.risky / cell.total >= 0.5 ? "255,92,92" : "200,212,0";
  return { backgroundColor: `rgba(${color},${intensity.toFixed(2)})` };
}

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** ¿Cuándo llegan tus correos? Día de la semana × hora (hora de Colombia). */
export default function ActivityHeatmap({ matrix }: { matrix: HeatCell[][] }) {
  const [hovered, setHovered] = useState<HeatCell | null>(null);
  const max = Math.max(1, ...matrix.flat().map((c) => c.total));
  const hasData = matrix.flat().some((c) => c.total > 0);

  return (
    <ChartCard
      title="¿Cuándo llegan tus correos?"
      subtitle="Día y hora de cada análisis · rojo = mayoría con alertas"
      className="xl:col-span-2"
    >
      {!hasData ? (
        <EmptyChartState
          icon={Clock}
          title="Sin datos"
          description="Aquí verás a qué horas recibes más correos y cuándo llegan las amenazas."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[560px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]"
              role="grid"
              aria-label="Mapa de calor por día y hora"
            >
              {matrix.map((row, day) => (
                <div key={day} role="row" className="contents">
                  <span
                    role="rowheader"
                    className="pr-1 text-right text-[11px] leading-5 text-guard-text-muted"
                  >
                    {WEEKDAY_LABELS[day]}
                  </span>
                  {row.map((cell) => (
                    <div
                      key={cell.hour}
                      role="gridcell"
                      aria-label={`${WEEKDAY_LABELS[day]} ${hourLabel(cell.hour)}: ${cell.total} correos, ${cell.risky} con alertas`}
                      onMouseEnter={() => setHovered(cell)}
                      onMouseLeave={() => setHovered(null)}
                      className="aspect-square min-h-3 rounded-[4px] transition-transform hover:scale-125"
                      style={cellStyle(cell, max)}
                    />
                  ))}
                </div>
              ))}
              <span />
              {Array.from({ length: 24 }, (_, hour) => (
                <span
                  key={hour}
                  className="text-center text-[10px] text-guard-text-muted"
                >
                  {HOUR_TICKS.includes(hour) ? hour : ""}
                </span>
              ))}
            </div>
          </div>
          <p className="h-5 text-xs text-guard-text-muted" aria-live="polite">
            {hovered
              ? `${WEEKDAY_LABELS[hovered.day]} ${hourLabel(hovered.hour)} · ${hovered.total} ${hovered.total === 1 ? "correo" : "correos"}${hovered.risky ? ` · ${hovered.risky} con alertas` : ""}`
              : "Pasa el cursor sobre una celda para ver el detalle."}
          </p>
        </div>
      )}
    </ChartCard>
  );
}
