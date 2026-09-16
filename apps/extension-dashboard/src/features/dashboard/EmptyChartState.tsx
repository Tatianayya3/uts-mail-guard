import type { LucideIcon } from "lucide-react";

type EmptyChartStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export default function EmptyChartState({
  icon: Icon,
  title,
  description,
  className = "h-56",
}: EmptyChartStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-center ${className}`}
    >
      <Icon className="h-6 w-6 text-guard-text-muted" strokeWidth={1.75} />
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="max-w-[26ch] text-xs text-guard-text-muted">
        {description}
      </p>
    </div>
  );
}
