"use client";

import { useState } from "react";
import type { ScanRecord } from "@mail-guard/contracts";
import {
  bucketScansByDay,
  buildTrustTrend,
  buildVerdictBreakdown,
  scansInRange,
  topSenderDomains,
  type RangeDays,
} from "./dashboard.utils";
import HistoryTable from "./HistoryTable";
import RangeSelector from "./RangeSelector";
import RecentAlertsCard from "./RecentAlertsCard";
import ScanDetailModal from "./ScanDetailModal";
import ScansVolumeChart from "./ScansVolumeChart";
import SenderDomainsCard from "./SenderDomainsCard";
import TrustTrendChart from "./TrustTrendChart";
import VerdictDonutChart from "./VerdictDonutChart";

type Props = { scans: ScanRecord[]; truncated: boolean };

/**
 * Parte interactiva del panel (ViewModel + vistas): el periodo elegido
 * filtra todos los gráficos a la vez, y alertas e historial abren el mismo
 * detalle.
 */
export default function DashboardInsights({ scans, truncated }: Props) {
  const [range, setRange] = useState<RangeDays>(30);
  const [selected, setSelected] = useState<ScanRecord | null>(null);

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
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrustTrendChart data={buildTrustTrend(inRange)} />
        <VerdictDonutChart
          data={buildVerdictBreakdown(inRange)}
          total={inRange.length}
        />
        <ScansVolumeChart data={bucketScansByDay(inRange, range)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentAlertsCard scans={inRange} onSelect={setSelected} />
        <SenderDomainsCard domains={topSenderDomains(inRange)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HistoryTable
          scans={scans}
          onSelect={setSelected}
          truncated={truncated}
        />
      </div>

      {selected && (
        <ScanDetailModal scan={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
