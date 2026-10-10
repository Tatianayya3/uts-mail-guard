"use client";

import { ShieldQuestion } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Verdict } from "@mail-guard/contracts";
import { cn } from "@mail-guard/ui";
import type { VerdictSlice } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import ChartTooltip from "./ChartTooltip";
import EmptyChartState from "./EmptyChartState";

type Props = {
  data: VerdictSlice[];
  total: number;
  /** Veredicto con el que se está filtrando el tablero, o null. */
  active: Verdict | null;
  onSelect: (verdict: Verdict | null) => void;
};

/** Distribución + control del filtro cruzado: un clic filtra todo el tablero. */
export default function VerdictDonutChart({
  data,
  total,
  active,
  onSelect,
}: Props) {
  const toggle = (verdict: Verdict) =>
    onSelect(active === verdict ? null : verdict);
  const focused = active ? data.find((s) => s.key === active) : null;

  return (
    <ChartCard
      title="Distribución de veredictos"
      subtitle="Haz clic en un veredicto para filtrar todo el tablero"
    >
      {total === 0 ? (
        <EmptyChartState
          icon={ShieldQuestion}
          title="Sin veredictos en este periodo"
          description="Tus resultados aparecerán aquí cuando analices correos."
        />
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative h-48 w-48 shrink-0"
            role="img"
            aria-label="Distribución de veredictos"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  strokeWidth={0}
                  cornerRadius={4}
                  onClick={(_, index) => {
                    const slice = data[index];
                    if (slice) toggle(slice.key);
                  }}
                  className="cursor-pointer outline-none"
                  animationDuration={600}
                >
                  {data.map((slice) => (
                    <Cell
                      key={slice.key}
                      fill={slice.color}
                      fillOpacity={!active || active === slice.key ? 1 : 0.18}
                      style={{ transition: "fill-opacity 200ms" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white tabular-nums">
                {focused ? focused.value : total}
              </span>
              <span className="text-[11px] text-guard-text-muted">
                {focused ? focused.label.toLowerCase() : "correos"}
              </span>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-1">
            {data.map((slice) => {
              const percentage = total
                ? Math.round((slice.value / total) * 100)
                : 0;
              const isActive = active === slice.key;
              return (
                <li key={slice.key}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    disabled={slice.value === 0}
                    onClick={() => toggle(slice.key)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      "hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-guard-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent",
                      isActive && "bg-white/[0.07]",
                      active && !isActive && "opacity-50",
                    )}
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap text-guard-text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      {slice.label}
                    </span>
                    <span className="whitespace-nowrap font-semibold text-white tabular-nums">
                      {slice.value}{" "}
                      <span className="font-normal text-guard-text-muted">
                        ({percentage}%)
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
