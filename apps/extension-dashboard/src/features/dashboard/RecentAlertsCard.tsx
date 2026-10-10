"use client";

import { BellOff } from "lucide-react";
import type { ScanRecord } from "@mail-guard/contracts";
import {
  VERDICT_BADGE_CLASS,
  VERDICT_ICON,
  VERDICT_LABEL,
} from "./dashboard.constants";
import { formatFullDate, formatRelativeTime } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

type Props = { scans: ScanRecord[]; onSelect: (scan: ScanRecord) => void };

const MAX_ALERTS = 5;

/** Los correos sospechosos o peligrosos más recientes: lo primero que hay que revisar. */
export default function RecentAlertsCard({ scans, onSelect }: Props) {
  const alerts = scans
    .filter((s) => s.verdict === "dangerous" || s.verdict === "suspicious")
    .slice(0, MAX_ALERTS);

  return (
    <ChartCard
      title="Alertas recientes"
      subtitle="Correos sospechosos o peligrosos del periodo"
    >
      {alerts.length === 0 ? (
        <EmptyChartState
          icon={BellOff}
          className="h-48"
          title="Sin alertas"
          description="Ningún correo sospechoso o peligroso en este periodo."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((scan) => {
            const Icon = VERDICT_ICON[scan.verdict];
            return (
              <li key={scan.id}>
                <button
                  type="button"
                  onClick={() => onSelect(scan)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-left transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-guard-accent"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${VERDICT_BADGE_CLASS[scan.verdict]}`}
                  >
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white">
                      {scan.subject || "Correo sin asunto"}
                    </span>
                    <span className="block truncate text-[11px] text-guard-text-muted">
                      {VERDICT_LABEL[scan.verdict]} · {scan.sender.domain}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-[11px] text-guard-text-muted"
                    title={formatFullDate(scan.analyzedAt)}
                    suppressHydrationWarning
                  >
                    {formatRelativeTime(scan.analyzedAt)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
