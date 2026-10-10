import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  type LucideIcon,
} from "lucide-react";
import { VERDICT_LABEL, type Verdict } from "@mail-guard/contracts";
import { cn } from "./cn";

export const VERDICT_ICON: Record<Verdict, LucideIcon> = {
  safe: ShieldCheck,
  suspicious: ShieldAlert,
  dangerous: ShieldX,
  unknown: ShieldQuestion,
};

export const VERDICT_TONE: Record<Verdict, string> = {
  safe: "border-guard-success/20 bg-guard-success-strong/15 text-guard-success",
  suspicious: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  dangerous: "border-red-300/20 bg-red-400/10 text-red-300",
  unknown: "border-white/10 bg-white/5 text-guard-text-muted",
};

type VerdictBadgeProps = {
  verdict: Verdict;
  /** Texto alternativo; por defecto la etiqueta del veredicto. */
  children?: React.ReactNode;
  withIcon?: boolean;
  className?: string;
};

/** Insignia de veredicto: color + ícono + texto (nunca solo color). */
export function VerdictBadge({
  verdict,
  children,
  withIcon = false,
  className,
}: VerdictBadgeProps) {
  const Icon = VERDICT_ICON[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        VERDICT_TONE[verdict],
        className,
      )}
    >
      {withIcon && (
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      )}
      {children ?? VERDICT_LABEL[verdict]}
    </span>
  );
}

/** Ícono circular de veredicto (para listas y tablas). */
export function VerdictIcon({
  verdict,
  className,
}: {
  verdict: Verdict;
  className?: string;
}) {
  const Icon = VERDICT_ICON[verdict];
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        VERDICT_TONE[verdict],
        className,
      )}
    >
      <Icon
        className="h-4 w-4"
        strokeWidth={2.25}
        aria-label={VERDICT_LABEL[verdict]}
      />
    </span>
  );
}
