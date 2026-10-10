"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { VERDICT_COLOR, VERDICT_LABEL } from "@mail-guard/contracts";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import EChart from "./charts/EChart";
import {
  COLORS,
  dot,
  escapeHtml,
  tooltipBase,
  type ChartOption,
} from "./charts/theme";
import { SAFE_THRESHOLD, SUSPICIOUS_THRESHOLD } from "./dashboard.constants";
import type { TrustTrendPoint } from "./dashboard.utils";

/** Con muchos puntos se activa el zoom (rueda/gesto y barra inferior). */
const ZOOM_FROM = 16;

const zone = (
  from: number,
  to: number,
  fill: string,
  labelColor: string,
  name: string,
) => [
  {
    yAxis: from,
    itemStyle: { color: fill },
    name,
    label: { color: labelColor },
  },
  { yAxis: to },
];

export default function TrustTrendChart({ data }: { data: TrustTrendPoint[] }) {
  const router = useRouter();
  const zoom = data.length >= ZOOM_FROM;

  const option = useMemo<ChartOption>(
    () => ({
      grid: {
        left: 8,
        right: 76,
        top: 16,
        bottom: zoom ? 56 : 24,
        containLabel: true,
      },
      tooltip: {
        ...tooltipBase,
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: "rgba(200,212,0,0.35)" },
        },
        formatter: (params: { dataIndex: number }[]) => {
          const point = data[params[0]?.dataIndex ?? 0];
          if (!point) return "";
          return `<div style="max-width:240px">
            <div style="color:${COLORS.muted};font-size:11px;margin-bottom:4px">${point.label}</div>
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(point.subject || "Correo sin asunto")}</div>
            <div style="margin-top:6px">${dot(VERDICT_COLOR[point.verdict])}${VERDICT_LABEL[point.verdict]} · <b>${point.trustScore}%</b></div>
            <div style="color:${COLORS.muted};font-size:11px;margin-top:6px">Clic para abrir</div>
          </div>`;
        },
      },
      xAxis: {
        type: "category",
        data: data.map((p) => p.label),
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: { formatter: "{value}%" },
      },
      // La línea se pinta del color de la zona en la que está cada tramo.
      visualMap: {
        show: false,
        dimension: 1,
        pieces: [
          { lt: SUSPICIOUS_THRESHOLD, color: COLORS.dangerous },
          {
            gte: SUSPICIOUS_THRESHOLD,
            lt: SAFE_THRESHOLD,
            color: COLORS.suspicious,
          },
          { gte: SAFE_THRESHOLD, color: COLORS.safe },
        ],
      },
      dataZoom: zoom
        ? [
            { type: "inside", startValue: Math.max(0, data.length - 20) },
            {
              type: "slider",
              height: 18,
              bottom: 8,
              borderColor: "transparent",
              backgroundColor: "rgba(255,255,255,0.03)",
              fillerColor: "rgba(200,212,0,0.12)",
              dataBackground: {
                lineStyle: { color: COLORS.axis },
                areaStyle: { color: "rgba(200,212,0,0.08)" },
              },
              handleStyle: { color: COLORS.accent, borderColor: COLORS.accent },
              moveHandleStyle: { color: "rgba(200,212,0,0.4)" },
              textStyle: { color: "transparent" },
            },
          ]
        : [],
      series: [
        {
          type: "line",
          smooth: 0.35,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(200,212,0,0.22)" },
                { offset: 1, color: "rgba(200,212,0,0)" },
              ],
            },
          },
          emphasis: { focus: "series", scale: 1.8 },
          cursor: "pointer",
          data: data.map((p) => ({
            value: p.trustScore,
            itemStyle: {
              color: VERDICT_COLOR[p.verdict],
              borderColor: COLORS.surface,
              borderWidth: 2,
            },
          })),
          markArea: {
            silent: true,
            label: { position: "right", fontSize: 11, distance: 10 },
            data: [
              zone(
                SAFE_THRESHOLD,
                100,
                "rgba(78,222,163,0.05)",
                COLORS.safe,
                "Seguro",
              ),
              zone(
                SUSPICIOUS_THRESHOLD,
                SAFE_THRESHOLD,
                "rgba(251,191,36,0.05)",
                COLORS.suspicious,
                "Sospechoso",
              ),
              zone(
                0,
                SUSPICIOUS_THRESHOLD,
                "rgba(255,92,92,0.06)",
                COLORS.dangerous,
                "Peligroso",
              ),
            ],
          },
        },
      ],
    }),
    [data, zoom],
  );

  return (
    <ChartCard
      title="Tendencia de confianza"
      subtitle={
        zoom
          ? "Clic en un punto para abrirlo · rueda o barra inferior para hacer zoom"
          : "Clic en un punto para abrir el análisis"
      }
      className="xl:col-span-2"
    >
      {data.length === 0 ? (
        <EmptyChartState
          icon={Activity}
          title="Sin análisis en este periodo"
          description="Escanea correos desde la extensión o amplía el periodo."
        />
      ) : (
        <EChart
          option={option}
          className={zoom ? "h-80" : "h-72"}
          ariaLabel={`Tendencia de confianza de ${data.length} correos`}
          onClick={({ dataIndex }) => {
            const point = dataIndex !== undefined ? data[dataIndex] : undefined;
            if (point) router.push(`/dashboard/historial/${point.id}`);
          }}
        />
      )}
    </ChartCard>
  );
}
