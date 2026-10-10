"use client";

import { useDeferredValue, useState, type KeyboardEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Search,
} from "lucide-react";
import type { ScanRecord, Verdict } from "@mail-guard/contracts";
import {
  VERDICT_BADGE_CLASS,
  VERDICT_ICON,
  VERDICT_LABEL,
  VERDICT_ORDER,
} from "./dashboard.constants";
import {
  filterScans,
  formatFullDate,
  formatRelativeTime,
  scansToCsv,
  type HistoryFilter,
} from "./dashboard.utils";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

const PAGE_SIZE = 10;

type Props = {
  scans: ScanRecord[];
  onSelect: (scan: ScanRecord) => void;
  /** true si hay más análisis históricos de los cargados en el panel. */
  truncated: boolean;
};

function downloadCsv(scans: ScanRecord[]) {
  const blob = new Blob([scansToCsv(scans)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mail-guard-historial-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function HistoryTable({ scans, onSelect, truncated }: Props) {
  const [filter, setFilter] = useState<HistoryFilter>({
    query: "",
    verdict: "all",
  });
  const [page, setPage] = useState(0);
  // La búsqueda no bloquea la escritura aunque haya muchos análisis.
  const deferredFilter = useDeferredValue(filter);

  const filtered = filterScans(scans, deferredFilter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  const updateFilter = (next: Partial<HistoryFilter>) => {
    setFilter((current) => ({ ...current, ...next }));
    setPage(0);
  };

  const onRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    scan: ScanRecord,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(scan);
    }
  };

  const chips: (Verdict | "all")[] = ["all", ...VERDICT_ORDER];

  return (
    <ChartCard
      title="Historial de análisis"
      subtitle={
        truncated
          ? `Tus últimos ${scans.length} análisis · selecciona uno para ver el detalle`
          : "Selecciona un análisis para ver el detalle completo"
      }
      className="lg:col-span-3"
      action={
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-guard-text-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          <Download
            className="h-3.5 w-3.5"
            strokeWidth={2.25}
            aria-hidden="true"
          />
          Exportar CSV
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-80">
          <span className="sr-only">Buscar por asunto o remitente</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-guard-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filter.query}
            onChange={(event) => updateFilter({ query: event.target.value })}
            placeholder="Buscar por asunto o remitente"
            className="h-9 w-full rounded-lg border border-white/10 bg-guard-surface/60 pl-9 pr-3 text-sm text-white outline-none placeholder:text-guard-text-muted/70 focus:border-guard-accent"
          />
        </label>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrar por veredicto"
        >
          {chips.map((verdict) => {
            const active = filter.verdict === verdict;
            return (
              <button
                key={verdict}
                type="button"
                aria-pressed={active}
                onClick={() => updateFilter({ verdict })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-guard-accent bg-guard-accent text-guard-surface"
                    : "border-white/10 text-guard-text-muted hover:text-white"
                }`}
              >
                {verdict === "all" ? "Todos" : VERDICT_LABEL[verdict]}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyChartState
          icon={Inbox}
          title={
            scans.length === 0 ? "Tu historial está vacío" : "Sin resultados"
          }
          description={
            scans.length === 0
              ? "Analiza un correo desde la extensión para verlo aquí."
              : "Prueba con otra búsqueda o quita el filtro."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-guard-surface-card">
              <tr className="border-b border-white/5 text-[10px] font-semibold uppercase tracking-wide text-guard-text-muted">
                <th scope="col" className="px-3 py-2.5">
                  Correo
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Remitente
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Veredicto
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Confianza
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((scan) => {
                const Icon = VERDICT_ICON[scan.verdict];
                return (
                  <tr
                    key={scan.id}
                    tabIndex={0}
                    onClick={() => onSelect(scan)}
                    onKeyDown={(event) => onRowKeyDown(event, scan)}
                    aria-label={`Ver detalle de ${scan.subject || "correo sin asunto"}`}
                    className="cursor-pointer transition-colors hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none"
                  >
                    <td className="max-w-[260px] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${VERDICT_BADGE_CLASS[scan.verdict]}`}
                        >
                          <Icon
                            className="h-3.5 w-3.5"
                            strokeWidth={2.25}
                            aria-hidden="true"
                          />
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
                    <td className="px-3 py-2.5 text-right font-semibold text-white tabular-nums">
                      {scan.trustScore}%
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2.5 text-xs text-guard-text-muted"
                      title={formatFullDate(scan.analyzedAt)}
                      suppressHydrationWarning
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

      {filtered.length > PAGE_SIZE && (
        <nav
          className="mt-3 flex items-center justify-between text-xs text-guard-text-muted"
          aria-label="Paginación del historial"
        >
          <span>
            {currentPage * PAGE_SIZE + 1}–
            {Math.min(filtered.length, (currentPage + 1) * PAGE_SIZE)} de{" "}
            {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Página anterior"
              className="rounded-lg border border-white/10 p-1.5 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              aria-label="Página siguiente"
              className="rounded-lg border border-white/10 p-1.5 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </ChartCard>
  );
}
