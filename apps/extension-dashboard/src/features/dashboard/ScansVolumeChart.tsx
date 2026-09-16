"use client";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VERDICT_COLOR, VERDICT_LABEL } from "./dashboard.constants";
import type { DailyVerdictBucket } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import ChartTooltip from "./ChartTooltip";
import EmptyChartState from "./EmptyChartState";

type ScansVolumeChartProps = {
  data: DailyVerdictBucket[];
};

export default function ScansVolumeChart({ data }: ScansVolumeChartProps) {
  const hasData = data.some((bucket) => bucket.total > 0);

  return (
    <ChartCard
      title="Volumen de escaneos"
      subtitle="Correos analizados por día, últimos 14 días"
      className="lg:col-span-3"
    >
      {!hasData ? (
        <EmptyChartState
          icon={BarChart3}
          title="Sin actividad reciente"
          description="Cuando escanees correos con la extensión, el volumen diario aparecerá aquí."
        />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(200,200,173,0.6)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                stroke="rgba(200,200,173,0.6)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={<ChartTooltip />}
              />
              <Bar
                dataKey="safe"
                name={VERDICT_LABEL.safe}
                stackId="verdict"
                fill={VERDICT_COLOR.safe}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="suspicious"
                name={VERDICT_LABEL.suspicious}
                stackId="verdict"
                fill={VERDICT_COLOR.suspicious}
              />
              <Bar
                dataKey="dangerous"
                name={VERDICT_LABEL.dangerous}
                stackId="verdict"
                fill={VERDICT_COLOR.dangerous}
              />
              <Bar
                dataKey="unknown"
                name={VERDICT_LABEL.unknown}
                stackId="verdict"
                fill={VERDICT_COLOR.unknown}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
