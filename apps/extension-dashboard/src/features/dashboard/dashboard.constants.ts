import type { SignalStatus, Verdict } from "./dashboard.types";

export const VERDICT_ORDER: Verdict[] = [
  "safe",
  "suspicious",
  "dangerous",
  "unknown",
];

export const VERDICT_LABEL: Record<Verdict, string> = {
  safe: "Seguro",
  suspicious: "Sospechoso",
  dangerous: "Peligroso",
  unknown: "Sin determinar",
};

// Hex values mirror the guard-* tailwind tokens (recharts needs real colors,
// not CSS vars, since it paints to SVG/canvas outside the Tailwind pipeline).
export const VERDICT_COLOR: Record<Verdict, string> = {
  safe: "#4edea3",
  suspicious: "#fbbf24",
  dangerous: "#ff5c5c",
  unknown: "#8f8f8f",
};

export const VERDICT_BADGE_CLASS: Record<Verdict, string> = {
  safe: "border-guard-success/20 bg-guard-success-strong/15 text-guard-success",
  suspicious: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  dangerous: "border-red-300/20 bg-red-400/10 text-red-300",
  unknown: "border-white/10 bg-white/5 text-guard-text-muted",
};

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  pass: "Correcto",
  warning: "Advertencia",
  fail: "Fallo",
  unknown: "Sin determinar",
};

export const SIGNAL_STATUS_BADGE_CLASS: Record<SignalStatus, string> = {
  pass: "border-guard-success/20 bg-guard-success-strong/15 text-guard-success",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  fail: "border-red-300/20 bg-red-400/10 text-red-300",
  unknown: "border-white/10 bg-white/5 text-guard-text-muted",
};

export const ACCENT_HEX = "#c8d400";
export const ACCENT_BRIGHT_HEX = "#e4f132";
