import type { ScanSignal, Verdict } from "@mail-guard/contracts";

const OPENING: Record<Verdict, string> = {
  safe: "No encontramos señales de phishing en este correo.",
  suspicious:
    "Este correo tiene señales que conviene verificar antes de actuar.",
  dangerous: "Este correo presenta señales claras de phishing o fraude.",
  unknown: "No hubo evidencia suficiente para determinar el riesgo.",
};

const ADVICE: Record<Verdict, string> = {
  safe: "Aun así, verifica el remitente antes de compartir datos sensibles.",
  suspicious:
    "Confirma con el remitente por otro canal y no abras enlaces ni adjuntos hasta estar seguro.",
  dangerous:
    "No hagas clic en enlaces ni respondas. Reporta el correo como phishing y elimínalo.",
  unknown:
    "Verifica el remitente y evita abrir enlaces o archivos si tienes dudas.",
};

/** Resumen en español construido a partir de las señales (sin texto inventado). */
export function buildSummary(verdict: Verdict, signals: ScanSignal[]): string {
  const alerts = signals
    .filter((s) => s.status === "fail" || s.status === "warning")
    // «2 revisados · 1 con alertas» no se entiende fuera de su tarjeta: para
    // los enlaces se usa el detalle («1 enlace oculta su destino…»).
    .map((s) => (s.key === "links" ? s.detail.replace(/\.$/, "") : s.value));
  const detail = alerts.length ? ` Hallazgos: ${alerts.join("; ")}.` : "";
  return `${OPENING[verdict]}${detail}`.slice(0, 500);
}

export function buildAdvice(verdict: Verdict): string {
  return ADVICE[verdict];
}
