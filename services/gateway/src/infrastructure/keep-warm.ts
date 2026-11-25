import type { Logger } from "@mail-guard/service-kit";

/**
 * Plan free de Render: cada servicio se duerme tras 15 min sin tráfico y por
 * separado. Si el gateway está despierto (alguien lo está usando), mantiene
 * despiertos también a analysis e history con un /health periódico, y los
 * despierta en cuanto él arranca. Así los tres duermen y despiertan juntos.
 */
export function keepServicesWarm(
  urls: Record<string, string>,
  logger: Logger,
  { intervalMs = 10 * 60_000 } = {},
) {
  const ping = () =>
    Promise.all(
      Object.entries(urls).map(async ([name, url]) => {
        try {
          const res = await fetch(`${url.replace(/\/+$/, "")}/health`, {
            signal: AbortSignal.timeout(90_000),
          });
          if (!res.ok)
            logger.warn("keep_warm_not_ok", { name, status: res.status });
        } catch (error) {
          logger.warn("keep_warm_failed", {
            name,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );

  void ping();
  const timer = setInterval(() => void ping(), intervalMs);
  // No impide que el proceso termine.
  (timer as { unref?: () => void }).unref?.();
  return () => clearInterval(timer);
}
