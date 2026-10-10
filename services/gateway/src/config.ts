import { z } from "zod";
import {
  internalTokenSchema,
  optionalString,
  parseEnv,
} from "@mail-guard/service-kit";

const schema = z.object({
  PORT: z.coerce.number().int().default(4000),
  INTERNAL_SERVICE_TOKEN: internalTokenSchema,
  ANALYSIS_SERVICE_URL: z.url().default("http://localhost:4001"),
  HISTORY_SERVICE_URL: z.url().default("http://localhost:4002"),
  SUPABASE_URL: optionalString(),
  SUPABASE_PUBLISHABLE_KEY: optionalString(),
  /** Orígenes permitidos separados por coma. En producción: chrome-extension://<ID>,https://tu-panel */
  CORS_ORIGINS: z.string().default("*"),
  SCAN_ANONYMOUS_LIMIT: z.coerce.number().int().positive().default(5),
  SCAN_AUTHENTICATED_LIMIT: z.coerce.number().int().positive().default(100),
  UPSTASH_REDIS_REST_URL: optionalString(),
  UPSTASH_REDIS_REST_TOKEN: optionalString(),
});

export type GatewayEnv = z.infer<typeof schema>;
export const loadConfig = (source?: Record<string, string | undefined>) =>
  parseEnv(schema, source);
