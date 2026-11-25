import type { ThreatIntel } from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import type { ServiceClient, ThreatFeed } from "../application/ports";

/**
 * Comunicación entre agentes: el gateway trae del history-service la base de
 * conocimiento del Centinela y se la entrega al Analista en cada análisis.
 *
 * Se guarda en memoria `ttlMs`. Si está vencida, se refresca esperando como
 * mucho `waitMs`; si history tarda o falla, se usa la última conocida para
 * que un análisis nunca quede bloqueado por el Centinela.
 */
export function createThreatFeed(
  history: ServiceClient,
  logger: Logger,
  { ttlMs = 60_000, waitMs = 1_500 } = {},
): ThreatFeed {
  let threats: ThreatIntel[] = [];
  let fetchedAt = 0;
  let inflight: Promise<void> | null = null;

  const refresh = () => {
    inflight ??= history
      .request<{ threats: ThreatIntel[] }>("/v1/agents/threats")
      .then((res) => {
        threats = res.threats;
        fetchedAt = Date.now();
      })
      .catch((error: unknown) => {
        logger.warn("threat_feed_refresh_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return {
    async get() {
      if (Date.now() - fetchedAt < ttlMs) return threats;
      await Promise.race([
        refresh(),
        new Promise((resolve) => setTimeout(resolve, waitMs)),
      ]);
      return threats;
    },
    invalidate() {
      fetchedAt = 0;
    },
  };
}
