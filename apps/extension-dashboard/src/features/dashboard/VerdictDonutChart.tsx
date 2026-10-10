"use client";

import { useMemo } from "react";
import { ShieldQuestion } from "lucide-react";
import type { Verdict } from "@mail-guard/contracts";
import { cn } from "@mail-guard/ui";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import EChart from "./charts/EChart";
import { COLORS, dot, tooltipBase, type ChartOption } from "./charts/theme";
import type { VerdictSlice } from "./dashboard.utils";

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
  const visible = data.filter((s) => s.value > 0);

  const option = useMemo<ChartOption>(
    () => ({
      tooltip: {
        ...tooltipBase,
        trigger: "item",
        formatter: (p: {
          name: string;
          value: number;
          percent: number;
          color: string;
        }) =>
          `${dot(p.color)}${p.name}: <b>${p.value}</b> (${p.percent}%)<div style="color:${COLORS.muted};font-size:11px;margin-top:4px">Clic para filtrar</div>`,
      },
      series: [
        {
          type: "pie",
          radius: ["64%", "90%"],
          padAngle: 3,
          cursor: "pointer",
          itemStyle: { borderRadius: 8 },
          label: { show: false },
          emphasis: { scale: true, scaleSize: 6 },
          data: visible.map((slice) => ({
            name: slice.label,
            value: slice.value,
            key: slice.key,
            itemStyle: {
              color: slice.color,
              opacity: !active || active === slice.key ? 1 : 0.18,
              shadowBlur: active === slice.key ? 18 : 0,
              shadowColor: slice.color,
            },
          })),
        },
      ],
    }),
    [visible, active],
  );

  return (
    <ChartCard
      title="Distribución de veredictos"
      subtitle="Clic en un veredicto para filtrar todo el tablero"
    >
      {total === 0 ? (
        <EmptyChartState
          icon={ShieldQuestion}
          title="Sin veredictos en este periodo"
          description="Tus resultados aparecerán aquí cuando analices correos."
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full">
            <EChart
              option={option}
              className="mx-auto h-52 max-w-60"
              ariaLabel="Distribución de veredictos"
              onClick={({ dataIndex }) => {
                const slice =
                  dataIndex !== undefined ? visible[dataIndex] : undefined;
                if (slice) toggle(slice.key);
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white tabular-nums">
                {focused ? focused.value : total}
              </span>
              <span className="text-[11px] text-guard-text-muted">
                {focused ? focused.label.toLowerCase() : "correos"}
              </span>
            </div>
          </div>
          <ul className="grid w-full grid-cols-2 gap-1.5">
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
                      "flex w-full flex-col rounded-xl border px-3 py-2 text-left transition-all",
                      "focus-visible:outline-2 focus-visible:outline-guard-accent disabled:cursor-default disabled:opacity-40",
                      isActive
                        ? "border-white/20 bg-white/[0.08]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/15",
                      active && !isActive && "opacity-50",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] text-guard-text-muted">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      {slice.label}
                    </span>
                    <span className="mt-0.5 text-sm font-semibold text-white tabular-nums">
                      {slice.value}{" "}
                      <span className="text-xs font-normal text-guard-text-muted">
                        · {percentage}%
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
