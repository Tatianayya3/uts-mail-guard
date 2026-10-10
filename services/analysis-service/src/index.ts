import { Redis } from "@upstash/redis";
import { createLogger } from "@mail-guard/service-kit";
import { createAnalyzeEmail } from "./application/analyze-email";
import { loadConfig } from "./config";
import { createMemoryCache, createRedisCache } from "./infrastructure/cache";
import { createDecisionEngine } from "./infrastructure/engines";
import { createRoutes } from "./http/routes";

// Composition root: el único lugar que conoce las implementaciones concretas.
const env = loadConfig();
const logger = createLogger("analysis-service");

const cache =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRedisCache(
        new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        }),
        env.CACHE_TTL_SECONDS,
        logger,
      )
    : createMemoryCache(env.CACHE_TTL_SECONDS);

const engine = createDecisionEngine(env, logger);
const app = createRoutes({
  logger,
  internalToken: env.INTERNAL_SERVICE_TOKEN,
  engineName: engine.name,
  analyzeEmail: createAnalyzeEmail({ engine, cache, logger }),
});

logger.info("listening", { port: env.PORT });

export default { port: env.PORT, fetch: app.fetch };
