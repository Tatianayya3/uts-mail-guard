import type {
  EmailSnapshot,
  ScanAnalysis,
  ScanResponse,
  StoredScan,
} from "@mail-guard/contracts";
import { tooManyRequests, type Logger } from "@mail-guard/service-kit";
import type { Identity, QuotaPolicy, ServiceClient } from "./ports";

type Deps = {
  analysis: ServiceClient;
  history: ServiceClient;
  quota: QuotaPolicy;
  logger: Logger;
};

/**
 * Orquesta UC-01 + UC-07 + UC-11: verifica cuota, pide el análisis y, si hay
 * sesión, lo guarda en el historial. Un fallo al guardar no rompe el análisis.
 */
export function createScanEmail({ analysis, history, quota, logger }: Deps) {
  return async function scanEmail(input: {
    email: EmailSnapshot;
    identity: Identity | null;
    clientKey: string;
    requestId?: string;
  }): Promise<ScanResponse> {
    const { email, identity, requestId } = input;
    const authenticated = Boolean(identity);
    const quotaKey = identity?.userId ?? input.clientKey;

    let currentQuota = await quota.peek(quotaKey, authenticated);
    if (currentQuota.remaining <= 0) {
      throw tooManyRequests(
        authenticated
          ? "Alcanzaste tu límite diario de análisis. Podrás analizar más correos mañana."
          : "Alcanzaste el límite diario sin cuenta. Inicia sesión para analizar más correos.",
      );
    }

    const result = await analysis.request<{
      analysis: ScanAnalysis;
      cached: boolean;
    }>("/v1/analyze", { method: "POST", body: { email }, requestId });
    // Un resultado en caché no consume IA, así que tampoco consume cuota.
    if (!result.cached)
      currentQuota = await quota.consume(quotaKey, authenticated);

    const scan: StoredScan = {
      ...result.analysis,
      provider: email.provider,
      subject: email.subject.trim() || "Correo sin asunto",
    };

    let saved = false;
    if (identity) {
      try {
        ({ saved } = await history.request<{ saved: boolean }>("/v1/scans", {
          method: "POST",
          body: { scan },
          token: identity.token,
          requestId,
        }));
      } catch (error) {
        logger.warn("history_save_failed", {
          requestId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { scan, cached: result.cached, saved, quota: currentQuota };
  };
}
