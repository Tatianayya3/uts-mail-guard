import Link from "next/link";
import { BellOff } from "lucide-react";
import { VERDICT_LABEL, type ScanRecord } from "@mail-guard/contracts";
import { VerdictIcon } from "@mail-guard/ui";
import { formatFullDate, formatRelativeTime } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

const MAX_ALERTS = 5;

/** Los correos sospechosos o peligrosos más recientes: lo primero que hay que revisar. */
export default function RecentAlertsCard({ scans }: { scans: ScanRecord[] }) {
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
        <ul className="stagger flex flex-col gap-2">
          {alerts.map((scan) => (
            <li key={scan.id}>
              <Link
                href={`/dashboard/historial/${scan.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-guard-accent"
              >
                <VerdictIcon verdict={scan.verdict} />
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
