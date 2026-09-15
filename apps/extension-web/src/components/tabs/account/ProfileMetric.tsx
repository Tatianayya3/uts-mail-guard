import type { ReactNode } from "react";

type ProfileMetricProps = {
  label: string;
  value: string | number;
  detail: string;
  accent?: boolean;
  variant?: "default" | "accent" | "success" | "warning" | "danger";
  badge?: string;
  icon?: ReactNode;
};

export default function ProfileMetric({
  label,
  value,
  detail,
  accent = false,
  variant,
  badge,
  icon,
}: ProfileMetricProps) {
  const activeVariant = variant ?? (accent ? "accent" : "default");

  const valueColor = {
    default: "text-white",
    accent: "text-guard-accent",
    success: "text-guard-success",
    warning: "text-amber-400",
    danger: "text-red-400",
  }[activeVariant];

  const glowBorder = {
    default: "border-white/10 hover:border-white/20",
    accent: "border-guard-accent/20 hover:border-guard-accent/40",
    success: "border-guard-success/20 hover:border-guard-success/40",
    warning: "border-amber-400/20 hover:border-amber-400/40",
    danger: "border-red-500/20 hover:border-red-500/40",
  }[activeVariant];

  return (
    <article
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white/5 p-3.5 backdrop-blur-xl transition-all duration-200 ${glowBorder} shadow-[0_4px_20px_rgba(0,0,0,0.18)]`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-guard-text-muted">
          {label}
        </p>
        {icon && <div className="text-guard-text-muted/60">{icon}</div>}
      </div>

      <div className="my-1.5 flex items-baseline gap-1.5">
        <p className={`text-2xl font-black tracking-tight ${valueColor}`}>
          {value}
        </p>
        {badge && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-guard-text-muted">
            {badge}
          </span>
        )}
      </div>

      <p className="text-[10px] font-medium text-guard-text-muted/80">
        {detail}
      </p>
    </article>
  );
}
