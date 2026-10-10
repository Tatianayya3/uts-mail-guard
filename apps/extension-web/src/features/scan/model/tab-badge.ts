import type { Verdict } from "@mail-guard/contracts";

const BADGE: Record<Verdict, { text: string; color: string }> = {
  safe: { text: "OK", color: "#10b981" },
  suspicious: { text: "!", color: "#d97706" },
  dangerous: { text: "!!", color: "#dc2626" },
  unknown: { text: "?", color: "#6b7280" },
};

/**
 * Marca el ícono de la extensión SOLO en la pestaña analizada: el usuario ve
 * el veredicto de un vistazo sin volver a abrir el popup. No requiere permisos.
 */
export async function markTab(tabId: number, verdict: Verdict): Promise<void> {
  const badge = BADGE[verdict];
  try {
    await chrome.action.setBadgeText({ tabId, text: badge.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
    await chrome.action.setBadgeTextColor?.({ tabId, color: "#ffffff" });
  } catch {
    // La pestaña pudo cerrarse mientras se analizaba: no es un error para el usuario.
  }
}
