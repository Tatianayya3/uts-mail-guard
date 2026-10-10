import { Redis } from "@upstash/redis";
import type { ScanAnalysis } from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import type { AnalysisCache } from "../../application/ports";

const PREFIX = "mail-guard:analysis:";

/** Caché en memoria con TTL y tamaño máximo (desarrollo / una sola instancia). */
export function createMemoryCache(
  ttlSeconds: number,
  maxEntries = 500,
): AnalysisCache {
  const entries = new Map<string, { value: ScanAnalysis; expiresAt: number }>();
  return {
    async get(hash) {
      const entry = entries.get(hash);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        entries.delete(hash);
        return null;
      }
      return entry.value;
    },
    async set(hash, value) {
      if (entries.size >= maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest) entries.delete(oldest);
      }
      entries.set(hash, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}

/** Caché distribuida en Upstash Redis. Los fallos nunca rompen el análisis. */
export function createRedisCache(
  redis: Redis,
  ttlSeconds: number,
  logger: Logger,
): AnalysisCache {
  return {
    async get(hash) {
      try {
        return (await redis.get<ScanAnalysis>(`${PREFIX}${hash}`)) ?? null;
      } catch (error) {
        logger.warn("cache_get_failed", { message: String(error) });
        return null;
      }
    },
    async set(hash, value) {
      try {
        await redis.set(`${PREFIX}${hash}`, value, { ex: ttlSeconds });
      } catch (error) {
        logger.warn("cache_set_failed", { message: String(error) });
      }
    },
  };
}
