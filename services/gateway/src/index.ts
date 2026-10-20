import { Redis } from "@upstash/redis";
import { createLogger, createMetrics } from "@mail-guard/service-kit";
import { createScanEmail } from "./application/scan-email";
import { loadConfig } from "./config";
import { createRoutes } from "./http/routes";
import {
  anonymousOnly,
  createSupabaseVerifier,
} from "./infrastructure/identity";
import { createMemoryQuota, createUpstashQuota } from "./infrastructure/quota";
import { createServiceClient } from "./infrastructure/service-client";

const env = loadConfig();
const logger = createLogger("gateway");
const metrics = createMetrics("gateway");
const scansTotal = metrics.counter({
  name: "mailguard_scans_total",
  help: "Correos analizados, por veredicto y si vinieron de la caché.",
  labelNames: ["verdict", "cached"],
});

const limits = {
  anonymous: env.SCAN_ANONYMOUS_LIMIT,
  authenticated: env.SCAN_AUTHENTICATED_LIMIT,
};
const quota =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashQuota(
        new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        }),
        limits,
      )
    : createMemoryQuota(limits);

const identity =
  env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY
    ? createSupabaseVerifier(
        { url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY },
        logger,
      )
    : anonymousOnly;

const analysis = createServiceClient(
  "analysis",
  env.ANALYSIS_SERVICE_URL,
  env.INTERNAL_SERVICE_TOKEN,
);
const history = createServiceClient(
  "history",
  env.HISTORY_SERVICE_URL,
  env.INTERNAL_SERVICE_TOKEN,
);

const app = createRoutes({
  logger,
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  identity,
  analysis,
  history,
  metrics,
  scanEmail: createScanEmail({
    analysis,
    history,
    quota,
    logger,
    metrics: {
      recorded: (verdict, cached) =>
        scansTotal.inc({ verdict, cached: String(cached) }),
    },
  }),
});

logger.info("listening", {
  port: env.PORT,
  quota: env.UPSTASH_REDIS_REST_URL ? "upstash" : "memory",
  auth: identity === anonymousOnly ? "disabled" : "supabase",
});

export default { port: env.PORT, fetch: app.fetch };
