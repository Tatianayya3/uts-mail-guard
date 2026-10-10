"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import EChart from "./charts/EChart";
import { COLORS, tooltipBase, type ChartOption } from "./charts/theme";
import { WEEKDAY_LABELS, type HeatCell } from "./dashboard.utils";

const HOURS = Array.from({ length: 24 }, (_, h) => `${h}h`);

/**
 * Valor divergente para la escala de color: 0 = sin correos; positivo
 * (lima) si la mayoría no tenía alertas; negativo (rojo) si la mayoría sí.
 * La magnitud crece con la cantidad de correos en esa hora.
 */
function heatValue(cell: HeatCell, max: number) {
  if (cell.total === 0) return 0;
  const intensity = 0.3 + 0.7 * (cell.total / max);
  return cell.risky / cell.total >= 0.5 ? -intensity : intensity;
}

/** ¿Cuándo llegan tus correos? Día de la semana × hora (hora de Colombia). */
export default function ActivityHeatmap({ matrix }: { matrix: HeatCell[][] }) {
  const cells = matrix.flat();
  const max = Math.max(1, ...cells.map((c) => c.total));
  const hasData = cells.some((c) => c.total > 0);

  const option = useMemo<ChartOption>(
    () => ({
      grid: { left: 4, right: 4, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase,
        formatter: (p: { data: { cell: HeatCell } }) => {
          const { cell } = p.data;
          return `<b>${WEEKDAY_LABELS[cell.day]} · ${String(cell.hour).padStart(2, "0")}:00</b><br/>${cell.total} ${cell.total === 1 ? "correo" : "correos"}${cell.risky ? ` · <span style="color:${COLORS.dangerous}">${cell.risky} con alertas</span>` : ""}`;
        },
      },
      xAxis: {
        type: "category",
        data: HOURS,
        axisLabel: { interval: 2 },
        splitArea: { show: false },
      },
      yAxis: { type: "category", data: [...WEEKDAY_LABELS], inverse: true },
      visualMap: {
        show: false,
        min: -1,
        max: 1,
        dimension: 2,
        inRange: {
          color: [
            COLORS.dangerous,
            "rgba(255,92,92,0.35)",
            "#232321",
            "rgba(200,212,0,0.35)",
            COLORS.accent,
          ],
        },
      },
      series: [
        {
          type: "heatmap",
          data: cells.map((cell) => ({
            value: [cell.hour, cell.day, heatValue(cell, max)],
            cell,
            itemStyle: {
              borderColor: COLORS.surface,
              borderWidth: 3,
              borderRadius: 5,
            },
          })),
          emphasis: { itemStyle: { borderColor: "#ffffff", borderWidth: 1 } },
        },
      ],
    }),
    [cells, max],
  );

  return (
    <ChartCard
      title="¿Cuándo analizas tus correos?"
      subtitle="Día y hora (Colombia) · rojo: la mayoría tenía alertas"
      className="xl:col-span-2"
    >
      {!hasData ? (
        <EmptyChartState
          icon={Clock}
          title="Sin datos"
          description="Aquí verás a qué horas analizas más correos y cuándo aparecen las amenazas."
        />
      ) : (
        <>
          <EChart
            option={option}
            className="h-64"
            ariaLabel="Mapa de calor de correos por día de la semana y hora"
          />
          <div className="mt-2 flex items-center gap-4 text-[11px] text-guard-text-muted">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(200,212,0,.25), #c8d400)",
                }}
              />
              Sin alertas
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,92,92,.25), #ff5c5c)",
                }}
              />
              Mayoría con alertas
            </span>
            <span className="ml-auto">Más intenso = más correos</span>
          </div>
        </>
      )}
    </ChartCard>
  );
}
