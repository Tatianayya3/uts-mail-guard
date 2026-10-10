"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import type { ChartOption } from "./theme";

type SparklineProps = {
  data: (number | null)[];
  color: string;
  label: string;
};

/** Mini gráfico de tendencia para las tarjetas de métricas (sin ejes). */
export default function Sparkline({ data, color, label }: SparklineProps) {
  const option = useMemo<ChartOption>(
    () => ({
      grid: { left: 0, right: 0, top: 4, bottom: 0 },
      xAxis: {
        type: "category",
        show: false,
        boundaryGap: false,
        data: data.map((_, i) => i),
      },
      yAxis: {
        type: "value",
        show: false,
        min: (v: { min: number }) => Math.min(0, v.min),
      },
      series: [
        {
          type: "line",
          data,
          smooth: 0.4,
          connectNulls: true,
          symbol: "none",
          silent: true,
          lineStyle: { width: 2, color },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}55` },
                { offset: 1, color: `${color}00` },
              ],
            },
          },
        },
      ],
    }),
    [data, color],
  );
  return <EChart option={option} className="h-10" ariaLabel={label} />;
}
