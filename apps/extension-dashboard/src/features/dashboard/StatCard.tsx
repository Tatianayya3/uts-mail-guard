import type { LucideIcon } from "lucide-react";

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
  value: string;
  helper?: string;
  tone?: StatTone;
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5 backdrop-blur-xl transition-colors duration-300 hover:border-guard-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-guard-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          {helper && (
            <p className="mt-1.5 truncate text-xs text-guard-text-muted">
              {helper}
            </p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASS[tone]}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
