import { createLogger } from "@mail-guard/service-kit";
import { loadConfig } from "./config";
import { createRoutes } from "./http/routes";
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

const app = createRoutes({
  logger,
  internalToken: env.INTERNAL_SERVICE_TOKEN,
  users,
});
logger.info("listening", { port: env.PORT });

export default { port: env.PORT, fetch: app.fetch };
