import {
  Info,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@mail-guard/ui";
import type { Insight } from "./dashboard.utils";

const TONE: Record<Insight["tone"], { icon: LucideIcon; className: string }> = {
  danger: {
    icon: TriangleAlert,
    className: "border-red-400/20 bg-red-400/[0.06] text-red-200",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-300/20 bg-amber-300/[0.06] text-amber-100",
  },
  success: {
    icon: TrendingUp,
    className:
      "border-guard-success/20 bg-guard-success/[0.06] text-guard-success",
  },
  info: {
    icon: Info,
    className:
      "border-guard-accent/20 bg-guard-accent/[0.05] text-guard-accent-bright",
  },
};

/** Hallazgos calculados a partir de tus datos: lo que un gráfico no dice solo. */
export default function InsightsStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <section aria-labelledby="insights-title" className="mb-4">
      <h3
        id="insights-title"
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-guard-text-muted"
      >
        <Sparkles
          className="h-3.5 w-3.5 text-guard-accent"
          aria-hidden="true"
        />{" "}
        Hallazgos del periodo
      </h3>
      <ul className="stagger grid gap-3 md:grid-cols-3">
        {insights.map((insight) => {
          const { icon: Icon, className } = TONE[insight.tone];
          return (
            <li
              key={insight.text}
              className={cn(
                "flex gap-3 rounded-2xl border p-4 text-sm leading-5 animate-fade-in",
                className,
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-white/90">{insight.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
