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
import {
  AXIS_COLOR,
  GRID_COLOR,
  VERDICT_COLOR,
  VERDICT_LABEL,
} from "./dashboard.constants";
import type { DailyVerdictBucket } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import ChartTooltip from "./ChartTooltip";
import EmptyChartState from "./EmptyChartState";

type ScansVolumeChartProps = {
  data: DailyVerdictBucket[];
};

export default function ScansVolumeChart({ data }: ScansVolumeChartProps) {
  const total = data.reduce((acc, bucket) => acc + bucket.total, 0);
  const hasData = data.some((bucket) => bucket.total > 0);

  return (
    <ChartCard
      title="Volumen de escaneos"
      subtitle={`Correos analizados por día · últimos ${data.length} días`}
      className="lg:col-span-3"
    >
      {!hasData ? (
        <EmptyChartState
          icon={BarChart3}
          title="Sin actividad en este periodo"
          description="Cuando escanees correos con la extensión, el volumen diario aparecerá aquí."
        />
      ) : (
        <div
          className="h-56 w-full"
          role="img"
          aria-label={`Volumen diario: ${total} correos`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={AXIS_COLOR}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                stroke={AXIS_COLOR}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={32}
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
