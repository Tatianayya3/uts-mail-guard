import { createLogger } from "@mail-guard/service-kit";
import { startSentinelScheduler } from "./agents/sentinel/scheduler";
import { createSentinel } from "./agents/sentinel/sentinel";
import { loadConfig } from "./config";
import { createRoutes } from "./http/routes";
import { createSupabaseAdminRepository } from "./infrastructure/supabase.admin";
import { createSupabaseSentinelRepository } from "./infrastructure/supabase.agents";
import { createSupabaseUserContext } from "./infrastructure/supabase.repository";

const env = loadConfig();
const logger = createLogger("history-service");

const users =
  env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY
    ? createSupabaseUserContext(
        { url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY },
        logger,
      )
    : null;
if (!users)
  logger.warn("supabase_not_configured", {
    effect: "history endpoints return 503",
  });

// Agente Centinela: necesita la clave secreta para ver los datos agregados.
const sentinelRepo =
  env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
    ? createSupabaseSentinelRepository(
        { url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY },
        logger,
      )
    : null;
const sentinel = sentinelRepo
  ? createSentinel({ repo: sentinelRepo, logger })
  : null;
const scheduler = sentinel
  ? startSentinelScheduler(sentinel, {
      intervalMinutes: env.SENTINEL_INTERVAL_MINUTES,
      logger,
    })
  : null;
if (!sentinel)
  logger.warn("sentinel_not_configured", {
    effect: "agente Centinela desactivado (falta SUPABASE_SECRET_KEY)",
  });

// Administración de usuarios: misma clave secreta que el Centinela.
const admin =
  env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
    ? createSupabaseAdminRepository(
        { url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY },
        logger,
      )
    : null;

const app = createRoutes({
  logger,
  internalToken: env.INTERNAL_SERVICE_TOKEN,
  users,
  agents: {
    sentinel,
    repo: sentinelRepo,
    intervalMinutes: env.SENTINEL_INTERVAL_MINUTES,
  },
  admin,
  onScansSaved: (verdicts) => scheduler?.notifyScans(verdicts),
});
logger.info("listening", { port: env.PORT });

export default { port: env.PORT, fetch: app.fetch };
