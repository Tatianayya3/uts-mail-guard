"use client";

import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ACCENT_HEX,
  AXIS_COLOR,
  GRID_COLOR,
  SAFE_THRESHOLD,
  SUSPICIOUS_THRESHOLD,
  VERDICT_COLOR,
  VERDICT_LABEL,
} from "./dashboard.constants";
import type { TrustTrendPoint } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

type TooltipProps = {
  active?: boolean;
  payload?: { payload: TrustTrendPoint }[];
};

function TrendTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="max-w-64 rounded-lg border border-white/10 bg-guard-surface/95 px-3 py-2 shadow-xl">
      <p className="text-[10px] font-medium uppercase tracking-wide text-guard-text-muted">
        {point.label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white">
        {point.subject || "Correo sin asunto"}
      </p>
      <p
        className="mt-1 text-xs"
        style={{ color: VERDICT_COLOR[point.verdict] }}
      >
        {VERDICT_LABEL[point.verdict]} · {point.trustScore}%
      </p>
    </div>
  );
}

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: TrustTrendPoint;
  onOpen?: (id: string) => void;
};

/** Punto coloreado por veredicto; un clic abre el análisis. */
function VerdictDot({ cx, cy, payload, onOpen }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <g className="cursor-pointer" onClick={() => onOpen?.(payload.id)}>
      <circle cx={cx} cy={cy} r={10} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill={VERDICT_COLOR[payload.verdict]}
        stroke="#131313"
        strokeWidth={1}
      />
    </g>
  );
}

/** Con muchos puntos aparece una barra para hacer zoom arrastrando. */
const BRUSH_FROM = 16;

export default function TrustTrendChart({ data }: { data: TrustTrendPoint[] }) {
  const router = useRouter();
  const open = (id: string) => router.push(`/dashboard/historial/${id}`);
  return (
    <ChartCard
      title="Tendencia de confianza"
      subtitle="Cada punto es un correo: haz clic para abrirlo"
      className="xl:col-span-2"
    >
      {data.length === 0 ? (
        <EmptyChartState
          icon={Activity}
          title="Sin análisis en este periodo"
          description="Escanea correos desde la extensión o amplía el periodo."
        />
      ) : (
        <div
          className="h-60 w-full"
          role="img"
          aria-label={`Tendencia de confianza de ${data.length} correos`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0 }}>
              <defs>
                <linearGradient id="trustFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT_HEX} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={ACCENT_HEX} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={AXIS_COLOR}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, SUSPICIOUS_THRESHOLD, SAFE_THRESHOLD, 100]}
                stroke={AXIS_COLOR}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <ReferenceLine
                y={SAFE_THRESHOLD}
                stroke={VERDICT_COLOR.safe}
                strokeOpacity={0.35}
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={SUSPICIOUS_THRESHOLD}
                stroke={VERDICT_COLOR.dangerous}
                strokeOpacity={0.35}
                strokeDasharray="4 4"
              />
              <Tooltip
                cursor={{ stroke: "rgba(200,212,0,0.3)", strokeWidth: 1 }}
                content={<TrendTooltip />}
              />
              <Area
                type="monotone"
                dataKey="trustScore"
                name="Confianza"
                stroke={ACCENT_HEX}
                strokeWidth={2}
                fill="url(#trustFill)"
                dot={<VerdictDot onOpen={open} />}
                activeDot={{ r: 5, fill: ACCENT_HEX }}
                isAnimationActive={false}
              />
              {data.length >= BRUSH_FROM && (
                <Brush
                  dataKey="label"
                  height={22}
                  travellerWidth={8}
                  stroke="rgba(200,212,0,0.6)"
                  fill="rgba(255,255,255,0.03)"
                  startIndex={Math.max(0, data.length - 20)}
                  tickFormatter={() => ""}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-3 text-[11px] text-guard-text-muted">
        Líneas guía: ≥ {SAFE_THRESHOLD} % seguro · &lt; {SUSPICIOUS_THRESHOLD} %
        peligroso
        {data.length >= BRUSH_FROM &&
          " · arrastra los bordes de la barra inferior para hacer zoom"}
      </p>
    </ChartCard>
  );
}
