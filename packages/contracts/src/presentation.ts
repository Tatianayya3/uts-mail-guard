import type { SignalKey, SignalStatus, Verdict } from "./scan";

/** Etiquetas y colores compartidos por la extensión y el panel web. */
export const VERDICT_ORDER: readonly Verdict[] = [
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

// Hex reales (los gráficos SVG no pueden leer tokens de Tailwind).
export const VERDICT_COLOR: Record<Verdict, string> = {
  safe: "#4edea3",
  suspicious: "#fbbf24",
  dangerous: "#ff5c5c",
  unknown: "#8f8f8f",
};

export const SIGNAL_KEY_LABEL: Record<SignalKey, string> = {
  sender: "Remitente",
  authentication: "Autenticación",
  content: "Contenido",
  links: "Enlaces",
};

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  pass: "Correcto",
  warning: "Advertencia",
  fail: "Fallo",
  unknown: "Sin determinar",
};

export function trustTone(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}
