"use client";

import { useMemo } from "react";
import { Radar } from "lucide-react";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import EChart from "./charts/EChart";
import { COLORS, tooltipBase, type ChartOption } from "./charts/theme";
import type { SignalBreakdown } from "./dashboard.utils";

const rateColor = (rate: number) =>
  rate >= 50 ? COLORS.dangerous : rate >= 20 ? COLORS.suspicious : COLORS.safe;

/** Anillos radiales: qué parte del correo delata más al phishing. */
export default function SignalBreakdownCard({
  signals,
}: {
  signals: SignalBreakdown[];
}) {
  const hasData = signals.some((s) => s.fail + s.warning + s.pass > 0);
  // De afuera hacia adentro: Remitente, Contenido, Enlaces.
  const rings = [...signals].reverse();

  const option = useMemo<ChartOption>(
    () => ({
      polar: { radius: ["28%", "96%"] },
      angleAxis: { max: 100, startAngle: 90, show: false },
      radiusAxis: {
        type: "category",
        data: rings.map((s) => s.label),
        show: false,
      },
      tooltip: {
        ...tooltipBase,
        formatter: (p: { dataIndex: number }) => {
          const s = rings[p.dataIndex];
          return s
            ? `<b>${s.label}</b>: ${s.alertRate}% con alertas<br/><span style="color:${COLORS.muted};font-size:11px">${s.fail} fallos · ${s.warning} advertencias · ${s.pass} correctos</span>`
            : "";
        },
      },
      series: [
        {
          type: "bar",
          coordinateSystem: "polar",
          roundCap: true,
          barWidth: 14,
          showBackground: true,
          backgroundStyle: { color: "rgba(255,255,255,0.05)" },
          data: rings.map((s) => ({
            value: s.alertRate,
            itemStyle: { color: rateColor(s.alertRate) },
          })),
        },
      ],
    }),
    [rings],
  );

  return (
    <ChartCard
      title="¿Qué delata a los correos?"
      subtitle="% de correos donde cada señal alertó"
    >
      {!hasData ? (
        <EmptyChartState
          icon={Radar}
          title="Sin señales"
          description="Las señales de tus análisis aparecerán aquí."
          className="h-48"
        />
      ) : (
        <div className="flex items-center gap-4">
          <EChart
            option={option}
            className="h-48 w-48 shrink-0"
            ariaLabel="Tasa de alerta por señal"
          />
          <ul className="flex flex-1 flex-col gap-3">
            {signals.map((s) => (
              <li key={s.key}>
                <p className="text-xs text-guard-text-muted">{s.label}</p>
                <p
                  className="text-xl font-bold tabular-nums"
                  style={{ color: rateColor(s.alertRate) }}
                >
                  {s.alertRate}%
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
