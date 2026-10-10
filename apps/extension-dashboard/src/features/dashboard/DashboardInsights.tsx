"use client";

import { parseAsNumberLiteral, useQueryState } from "nuqs";
import type { ScanRecord } from "@mail-guard/contracts";
import {
  RANGE_OPTIONS,
  bucketScansByDay,
  buildTrustTrend,
  buildVerdictBreakdown,
  scansInRange,
  topSenderDomains,
} from "./dashboard.utils";
import RangeSelector from "./RangeSelector";
import RecentAlertsCard from "./RecentAlertsCard";
import ScansVolumeChart from "./ScansVolumeChart";
import SenderDomainsCard from "./SenderDomainsCard";
import TrustTrendChart from "./TrustTrendChart";
import VerdictDonutChart from "./VerdictDonutChart";

/**
 * Parte interactiva del resumen. El periodo vive en la URL (?periodo=7), así
 * se puede compartir el enlace y el botón «atrás» funciona.
 */
export default function DashboardInsights({ scans }: { scans: ScanRecord[] }) {
  const [range, setRange] = useQueryState(
    "periodo",
    parseAsNumberLiteral(RANGE_OPTIONS)
      .withDefault(30)
      .withOptions({ scroll: false }),
  );
  const inRange = scansInRange(scans, range);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Actividad</h2>
          <p className="text-xs text-guard-text-muted">
            {inRange.length}{" "}
            {inRange.length === 1 ? "correo analizado" : "correos analizados"}{" "}
            en los últimos {range} días
          </p>
        </div>
        <RangeSelector
          value={range}
          onChange={(value) => void setRange(value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TrustTrendChart data={buildTrustTrend(inRange)} />
        <VerdictDonutChart
          data={buildVerdictBreakdown(inRange)}
          total={inRange.length}
        />
        <ScansVolumeChart data={bucketScansByDay(inRange, range)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentAlertsCard scans={inRange} />
        <SenderDomainsCard domains={topSenderDomains(inRange)} />
      </div>
    </>
  );
}
