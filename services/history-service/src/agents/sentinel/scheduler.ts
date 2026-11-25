import type { Verdict } from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import type { Sentinel } from "./sentinel";

/**
 * Autonomía del Centinela: nadie tiene que pedirle que trabaje.
 *
 * - Periódico: un ciclo cada `intervalMinutes` y otro poco después de arrancar
 *   (en Render el servicio duerme sin tráfico; al despertar se pone al día).
 * - Por eventos: si se guarda un análisis sospechoso o peligroso, programa un
 *   ciclo (con espera, para agrupar varios análisis seguidos en uno solo).
 */
export function startSentinelScheduler(
  sentinel: Sentinel,
  options: {
    intervalMinutes: number;
    logger: Logger;
    bootDelayMs?: number;
    eventDelayMs?: number;
  },
) {
  const { logger, bootDelayMs = 20_000, eventDelayMs = 45_000 } = options;
  let pendingEvent: ReturnType<typeof setTimeout> | null = null;

  const run = (trigger: "automatic" | "event") =>
    sentinel.run(trigger).catch((error: unknown) =>
      logger.error("sentinel_scheduler_failed", {
        trigger,
        message: error instanceof Error ? error.message : String(error),
      }),
    );

  const boot = setTimeout(() => void run("automatic"), bootDelayMs);
  const interval = setInterval(
    () => void run("automatic"),
    Math.max(1, options.intervalMinutes) * 60_000,
  );
  logger.info("sentinel_scheduler_started", {
    intervalMinutes: options.intervalMinutes,
  });

  return {
    /** Avisa de análisis guardados; dispara un ciclo si hay alguno con riesgo. */
    notifyScans(verdicts: Verdict[]) {
      if (!verdicts.some((v) => v === "dangerous" || v === "suspicious"))
        return;
      if (pendingEvent) return;
      pendingEvent = setTimeout(() => {
        pendingEvent = null;
        void run("event");
      }, eventDelayMs);
    },
    stop() {
      clearTimeout(boot);
      clearInterval(interval);
      if (pendingEvent) clearTimeout(pendingEvent);
    },
  };
}
