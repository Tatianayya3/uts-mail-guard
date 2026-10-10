"use client";

import { useDeferredValue } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Search,
} from "lucide-react";
import {
  VERDICT_LABEL,
  VERDICT_ORDER,
  type ScanRecord,
} from "@mail-guard/contracts";
import { Button, VerdictBadge, VerdictIcon, cn } from "@mail-guard/ui";
import {
  filterScans,
  formatFullDate,
  formatRelativeTime,
} from "./dashboard.utils";
import { downloadCsv } from "./download";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

const PAGE_SIZE = 12;
const VERDICT_FILTERS = ["all", ...VERDICT_ORDER] as const;

/**
 * Historial con búsqueda, filtro y paginación. El estado vive en la URL
 * (?q=…&veredicto=…&pagina=…): se puede compartir, recargar o volver atrás
 * desde el detalle sin perder el filtro.
 */
export default function HistoryTable({
  scans,
  truncated,
}: {
  scans: ScanRecord[];
  truncated: boolean;
}) {
  const router = useRouter();
  const [params, setParams] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      veredicto: parseAsStringLiteral(VERDICT_FILTERS).withDefault("all"),
      pagina: parseAsInteger.withDefault(1),
      dia: parseAsString.withDefault(""),
    },
    { scroll: false, throttleMs: 300 },
  );
  const query = useDeferredValue(params.q);

  const filtered = filterScans(scans, {
    query,
    verdict: params.veredicto,
    day: params.dia,
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, params.pagina), pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ChartCard
      title={`${filtered.length} análisis`}
      subtitle={
        truncated
          ? `Mostrando tus últimos ${scans.length} análisis`
          : "Todo tu historial"
      }
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
          icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Exportar CSV
        </Button>
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
            value={params.q}
            onChange={(event) =>
              void setParams({ q: event.target.value || null, pagina: null })
            }
            placeholder="Buscar por asunto o remitente"
            className="h-9 w-full rounded-lg border border-white/10 bg-guard-surface/60 pl-9 pr-3 text-sm text-white outline-none placeholder:text-guard-text-muted/70 focus:border-guard-accent"
          />
        </label>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrar por veredicto"
        >
          {VERDICT_FILTERS.map((verdict) => {
            const active = params.veredicto === verdict;
            return (
              <button
                key={verdict}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  void setParams({
                    veredicto: verdict === "all" ? null : verdict,
                    pagina: null,
                  })
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  active
                    ? "border-guard-accent bg-guard-accent text-guard-surface"
                    : "border-white/10 text-guard-text-muted hover:text-white",
                )}
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
            <tbody className="stagger divide-y divide-white/5">
              {visible.map((scan) => {
                const href = `/dashboard/historial/${scan.id}`;
                return (
                  <tr
                    key={scan.id}
                    onClick={() => router.push(href)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="max-w-[280px] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <VerdictIcon
                          verdict={scan.verdict}
                          className="h-7 w-7"
                        />
                        <Link
                          href={href}
                          onClick={(event) => event.stopPropagation()}
                          className="truncate font-medium text-white hover:underline focus-visible:outline-2 focus-visible:outline-guard-accent"
                        >
                          {scan.subject || "Correo sin asunto"}
                        </Link>
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
                      <VerdictBadge verdict={scan.verdict} />
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
            {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(filtered.length, page * PAGE_SIZE)} de {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void setParams({ pagina: page - 1 === 1 ? null : page - 1 })
              }
              disabled={page <= 1}
              aria-label="Página anterior"
              icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void setParams({ pagina: page + 1 })}
              disabled={page >= pageCount}
              aria-label="Página siguiente"
              icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </nav>
      )}
    </ChartCard>
  );
}
