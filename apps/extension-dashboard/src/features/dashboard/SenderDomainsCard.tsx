import { Globe } from "lucide-react";
import { VerdictBadge } from "@mail-guard/ui";
import type { DomainInsight } from "./dashboard.utils";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

export default function SenderDomainsCard({
  domains,
}: {
  domains: DomainInsight[];
}) {
  const max = Math.max(1, ...domains.map((d) => d.total));
  return (
    <ChartCard
      title="Dominios remitentes"
      subtitle="Primero los que enviaron correos con alertas"
    >
      {domains.length === 0 ? (
        <EmptyChartState
          icon={Globe}
          className="h-48"
          title="Sin remitentes"
          description="Aquí verás qué dominios te escriben más y cuáles son riesgosos."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {domains.map((d) => (
            <li key={d.domain} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className="truncate font-medium text-white"
                  title={d.domain}
                >
                  {d.domain}
                </span>
                <VerdictBadge
                  verdict={d.worst}
                  className="shrink-0 text-[10px]"
                >
                  {d.risky > 0 ? `${d.risky} con alertas` : undefined}
                </VerdictBadge>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${d.risky > 0 ? "bg-red-400/70" : "bg-guard-success/60"}`}
                    style={{ width: `${(d.total / max) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-[11px] text-guard-text-muted tabular-nums">
                  {d.total} · {d.averageScore}% prom.
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
