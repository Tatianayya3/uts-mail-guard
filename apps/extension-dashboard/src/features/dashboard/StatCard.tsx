import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

type StatTone = "accent" | "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<StatTone, string> = {
  accent: "bg-guard-accent/10 text-guard-accent",
  success: "bg-guard-success-strong/15 text-guard-success",
  warning: "bg-amber-300/10 text-amber-200",
  danger: "bg-red-400/10 text-red-300",
  neutral: "bg-white/5 text-guard-text-muted",
};

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: StatTone;
  /** Variación frente al periodo anterior; se muestra con flecha y texto. */
  trend?: { value: number; label: string };
  /** Mini gráfico opcional (sparkline) bajo la cifra. */
  chart?: ReactNode;
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
  trend,
  chart,
}: StatCardProps) {
  const TrendIcon = trend && trend.value < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-guard-accent/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-guard-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${TONE_CLASS[tone]}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-guard-text-muted">
        {trend && trend.value !== 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 font-medium text-white/90">
            <TrendIcon
              className="h-3 w-3"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            {trend.value > 0 ? "+" : ""}
            {trend.value} {trend.label}
          </span>
        )}
        {helper && <span className="truncate">{helper}</span>}
      </div>
      {chart && <div className="-mx-1 mt-3">{chart}</div>}
    </div>
  );
}
