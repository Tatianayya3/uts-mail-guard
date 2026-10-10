import type { SignalStatus, Verdict } from "@mail-guard/contracts";

export {
  SIGNAL_STATUS_LABEL,
  VERDICT_COLOR,
  VERDICT_LABEL,
  VERDICT_ORDER,
} from "@mail-guard/contracts";

export const VERDICT_BADGE_CLASS: Record<Verdict, string> = {
  safe: "border-guard-success/20 bg-guard-success-strong/15 text-guard-success",
  suspicious: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  dangerous: "border-red-300/20 bg-red-400/10 text-red-300",
  unknown: "border-white/10 bg-white/5 text-guard-text-muted",
};

export const SIGNAL_STATUS_BADGE_CLASS: Record<SignalStatus, string> = {
  pass: VERDICT_BADGE_CLASS.safe,
  warning: VERDICT_BADGE_CLASS.suspicious,
  fail: VERDICT_BADGE_CLASS.dangerous,
  unknown: VERDICT_BADGE_CLASS.unknown,
};

export const ACCENT_HEX = "#c8d400";
export const ACCENT_BRIGHT_HEX = "#e4f132";
