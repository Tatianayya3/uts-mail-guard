"use client";

import { type KeyboardEvent, useState } from "react";
import {
  Inbox,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  type LucideIcon,
} from "lucide-react";
import { VERDICT_BADGE_CLASS, VERDICT_LABEL } from "./dashboard.constants";
import { formatFullDate, formatRelativeTime } from "./dashboard.utils";
import type { ScanRecord as MailScanRecord } from "@mail-guard/contracts";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";
import ScanDetailModal from "./ScanDetailModal";

const VERDICT_ICON: Record<MailScanRecord["verdict"], LucideIcon> = {
  safe: ShieldCheck,
  suspicious: ShieldAlert,
  dangerous: ShieldX,
  unknown: ShieldQuestion,
};

type RecentScansTableProps = {
  scans: MailScanRecord[];
};

export default function RecentScansTable({ scans }: RecentScansTableProps) {
  const [selected, setSelected] = useState<MailScanRecord | null>(null);

  const openRow = (scan: MailScanRecord) => setSelected(scan);
  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    scan: MailScanRecord,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRow(scan);
    }
  };

  return (
    <ChartCard
      title="Correos analizados"
      subtitle="Toca una fila para ver el detalle completo del análisis"
      className="lg:col-span-3"
    >
      {scans.length === 0 ? (
        <EmptyChartState
          icon={Inbox}
          title="Tu bandeja está tranquila"
          description="No hay escaneos todavía. Analiza un correo desde la extensión para verlo aquí."
        />
      ) : (
        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-white/5">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-guard-surface-card">
              <tr className="border-b border-white/5 text-[10px] font-semibold uppercase tracking-wide text-guard-text-muted">
                <th className="px-3 py-2.5 font-semibold">Correo</th>
                <th className="px-3 py-2.5 font-semibold">Remitente</th>
                <th className="px-3 py-2.5 font-semibold">Veredicto</th>
                <th className="px-3 py-2.5 font-semibold">Confianza</th>
                <th className="px-3 py-2.5 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {scans.map((scan) => {
                const Icon = VERDICT_ICON[scan.verdict];
                return (
                  <tr
                    key={scan.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRow(scan)}
                    onKeyDown={(event) => handleRowKeyDown(event, scan)}
                    aria-label={`Ver detalle de ${scan.subject || "correo sin asunto"}`}
                    className="cursor-pointer transition-colors hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none"
                  >
                    <td className="max-w-[240px] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${VERDICT_BADGE_CLASS[scan.verdict]}`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </span>
                        <span className="truncate font-medium text-white">
                          {scan.subject || "Correo sin asunto"}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      <p className="truncate text-white/90">
                        {scan.sender.displayName || scan.sender.email}
                      </p>
                      <p className="truncate text-xs text-guard-text-muted">
                        {scan.sender.domain}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${VERDICT_BADGE_CLASS[scan.verdict]}`}
                      >
                        {VERDICT_LABEL[scan.verdict]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-white">
                      {scan.trustScore}%
                    </td>
                    <td
                      className="px-3 py-2.5 text-xs whitespace-nowrap text-guard-text-muted"
                      title={formatFullDate(scan.analyzedAt)}
                    >
                      {formatRelativeTime(scan.analyzedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ScanDetailModal scan={selected} onClose={() => setSelected(null)} />
      )}
    </ChartCard>
  );
}
