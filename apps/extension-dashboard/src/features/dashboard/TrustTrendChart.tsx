"use client";

import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ACCENT_HEX } from "./dashboard.constants";
import type { TrustTrendPoint } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import ChartTooltip from "./ChartTooltip";
import EmptyChartState from "./EmptyChartState";

type TrustTrendChartProps = {
  data: TrustTrendPoint[];
};

export default function TrustTrendChart({ data }: TrustTrendChartProps) {
  return (
    <ChartCard
      title="Tendencia de confianza"
      subtitle="Puntaje de confianza por correo analizado"
      className="lg:col-span-2"
    >
      {data.length === 0 ? (
        <EmptyChartState
          icon={Activity}
          title="Aún no hay tendencia"
          description="Escanea correos desde la extensión para ver la evolución de tu puntaje de confianza."
        />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16 }}>
              <defs>
                <linearGradient id="trustFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT_HEX} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(200,200,173,0.6)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgba(200,200,173,0.6)"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ stroke: "rgba(200,212,0,0.3)", strokeWidth: 1 }}
                content={<ChartTooltip unit="%" />}
              />
              <Area
                type="monotone"
                dataKey="trustScore"
                name="Confianza"
                stroke={ACCENT_HEX}
                strokeWidth={2}
                fill="url(#trustFill)"
                activeDot={{ r: 4, fill: ACCENT_HEX }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
