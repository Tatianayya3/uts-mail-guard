"use client";

import {
  parseAsNumberLiteral,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { X } from "lucide-react";
import {
  VERDICT_COLOR,
  VERDICT_LABEL,
  VERDICT_ORDER,
  type ScanRecord,
} from "@mail-guard/contracts";
import {
  RANGE_OPTIONS,
  bucketScansByDay,
  buildInsights,
  buildTrustTrend,
  buildVerdictBreakdown,
  scansInRange,
  signalBreakdown,
  topSenderDomains,
  weekdayHourMatrix,
} from "./dashboard.utils";
import ActivityHeatmap from "./ActivityHeatmap";
import InsightsStrip from "./InsightsStrip";
import RangeSelector from "./RangeSelector";
import RecentAlertsCard from "./RecentAlertsCard";
import ScansVolumeChart from "./ScansVolumeChart";
import SenderDomainsCard from "./SenderDomainsCard";
import SignalBreakdownCard from "./SignalBreakdownCard";
import TrustTrendChart from "./TrustTrendChart";
import VerdictDonutChart from "./VerdictDonutChart";

/**
 * Tablero interactivo con filtrado cruzado. El periodo y el veredicto
 * enfocado viven en la URL (?periodo=7&enfoque=dangerous): el enlace se
 * puede compartir y el botón «atrás» deshace el filtro.
 */
export default function DashboardInsights({ scans }: { scans: ScanRecord[] }) {
  const [{ periodo: range, enfoque: focus }, setParams] = useQueryStates(
    {
      periodo: parseAsNumberLiteral(RANGE_OPTIONS).withDefault(30),
      enfoque: parseAsStringLiteral(VERDICT_ORDER),
    },
    { scroll: false },
  );

  const inRange = scansInRange(scans, range);
  // Todo menos la dona usa el subconjunto enfocado; la dona muestra el total
  // para que se vea qué parte se está mirando.
  const focused = focus ? inRange.filter((s) => s.verdict === focus) : inRange;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Actividad</h2>
          <p className="text-xs text-guard-text-muted" aria-live="polite">
            {focused.length} {focused.length === 1 ? "correo" : "correos"}
            {focus
              ? ` ${VERDICT_LABEL[focus].toLowerCase()}s`
              : " analizados"}{" "}
            en los últimos {range} días
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {focus && (
            <button
              type="button"
              onClick={() => void setParams({ enfoque: null })}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-2.5 pr-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 animate-fade-in"
              aria-label={`Quitar filtro ${VERDICT_LABEL[focus]}`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: VERDICT_COLOR[focus] }}
              />
              {VERDICT_LABEL[focus]}
              <X
                className="h-3.5 w-3.5 text-guard-text-muted"
                aria-hidden="true"
              />
            </button>
          )}
          <RangeSelector
            value={range}
            onChange={(value) => void setParams({ periodo: value })}
          />
        </div>
      </div>

      <InsightsStrip insights={buildInsights(inRange)} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TrustTrendChart data={buildTrustTrend(focused)} />
        <VerdictDonutChart
          data={buildVerdictBreakdown(inRange)}
          total={inRange.length}
          active={focus}
          onSelect={(verdict) => void setParams({ enfoque: verdict })}
        />
        <ScansVolumeChart data={bucketScansByDay(focused, range)} />
        <ActivityHeatmap matrix={weekdayHourMatrix(focused)} />
        <SignalBreakdownCard signals={signalBreakdown(focused)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentAlertsCard scans={focused} />
        <SenderDomainsCard domains={topSenderDomains(focused)} />
      </div>
    </>
  );
}
