"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import {
  VERDICT_COLOR,
  VERDICT_LABEL,
  VERDICT_ORDER,
} from "@mail-guard/contracts";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import EChart from "./charts/EChart";
import { COLORS, dot, tooltipBase, type ChartOption } from "./charts/theme";
import type { DailyVerdictBucket } from "./dashboard.utils";

/** Barras apiladas por veredicto + línea de confianza promedio del día. */
export default function ScansVolumeChart({
  data,
}: {
  data: DailyVerdictBucket[];
}) {
  const router = useRouter();
  const hasData = data.some((bucket) => bucket.total > 0);

  const option = useMemo<ChartOption>(
    () => ({
      grid: { left: 8, right: 8, top: 44, bottom: 8, containLabel: true },
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 14,
        textStyle: { color: COLORS.muted, fontSize: 11 },
        inactiveColor: "rgba(255,255,255,0.2)",
      },
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: { color: "rgba(255,255,255,0.04)" },
        },
        formatter: (params: { dataIndex: number }[]) => {
          const bucket = data[params[0]?.dataIndex ?? 0];
          if (!bucket) return "";
          const rows = VERDICT_ORDER.filter((v) => bucket[v] > 0)
            .map(
              (v) =>
                `<div>${dot(VERDICT_COLOR[v])}${VERDICT_LABEL[v]} <b style="float:right;margin-left:16px">${bucket[v]}</b></div>`,
            )
            .join("");
          return `<div style="min-width:170px">
            <div style="color:${COLORS.muted};font-size:11px;margin-bottom:6px">${bucket.label} · ${bucket.total} ${bucket.total === 1 ? "correo" : "correos"}</div>
            ${rows || "<div>Sin análisis</div>"}
            ${bucket.averageTrust !== null ? `<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,.08);padding-top:6px">${dot(COLORS.accent)}Confianza <b style="float:right">${bucket.averageTrust}%</b></div>` : ""}
            ${bucket.total ? `<div style="color:${COLORS.muted};font-size:11px;margin-top:6px">Clic para ver ese día</div>` : ""}
          </div>`;
        },
      },
      xAxis: { type: "category", data: data.map((b) => b.label) },
      yAxis: [
        { type: "value", minInterval: 1 },
        {
          type: "value",
          min: 0,
          max: 100,
          axisLabel: { formatter: "{value}%" },
          splitLine: { show: false },
        },
      ],
      series: [
        ...VERDICT_ORDER.map((verdict) => ({
          name: VERDICT_LABEL[verdict],
          type: "bar",
          stack: "verdict",
          barMaxWidth: 22,
          cursor: "pointer",
          itemStyle: { color: VERDICT_COLOR[verdict], borderRadius: 3 },
          emphasis: { focus: "series" },
          data: data.map((b) => b[verdict]),
        })),
        {
          name: "Confianza promedio",
          type: "line",
          yAxisIndex: 1,
          smooth: 0.3,
          connectNulls: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: COLORS.accent, type: "dashed" },
          itemStyle: { color: COLORS.accent },
          data: data.map((b) => b.averageTrust),
        },
      ],
    }),
    [data],
  );

  return (
    <ChartCard
      title="Volumen y confianza por día"
      subtitle={`Últimos ${data.length} días · clic en una columna para ver ese día en el historial`}
      className="xl:col-span-3"
    >
      {!hasData ? (
        <EmptyChartState
          icon={BarChart3}
          title="Sin actividad en este periodo"
          description="Cuando escanees correos con la extensión, el volumen diario aparecerá aquí."
        />
      ) : (
        <EChart
          option={option}
          className="h-72"
          ariaLabel={`Volumen diario de análisis y confianza promedio en ${data.length} días`}
          onClick={({ dataIndex }) => {
            const bucket =
              dataIndex !== undefined ? data[dataIndex] : undefined;
            if (bucket?.total)
              router.push(`/dashboard/historial?dia=${bucket.date}`);
          }}
        />
      )}
    </ChartCard>
  );
}
