"use client";

import { ShieldQuestion } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { VerdictSlice } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import ChartTooltip from "./ChartTooltip";
import EmptyChartState from "./EmptyChartState";

type VerdictDonutChartProps = {
  data: VerdictSlice[];
  total: number;
};

export default function VerdictDonutChart({
  data,
  total,
}: VerdictDonutChartProps) {
  const hasData = total > 0;

  return (
    <ChartCard
      title="Distribución de veredictos"
      subtitle="Correos del periodo por clasificación"
    >
      {!hasData ? (
        <EmptyChartState
          icon={ShieldQuestion}
          title="Sin veredictos en este periodo"
          description="Tus resultados aparecerán aquí cuando analices correos."
        />
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative h-44 w-44 shrink-0"
            role="img"
            aria-label="Distribución de veredictos"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={76}
                  paddingAngle={3}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {data.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{total}</span>
              <span className="text-[10px] text-guard-text-muted">correos</span>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-2.5">
            {data.map((slice) => {
              const percentage = total
                ? Math.round((slice.value / total) * 100)
                : 0;
              return (
                <li
                  key={slice.key}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="flex items-center gap-2 whitespace-nowrap text-guard-text-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.label}
                  </span>
                  <span className="whitespace-nowrap font-semibold text-white">
                    {slice.value}{" "}
                    <span className="font-normal text-guard-text-muted">
                      ({percentage}%)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
