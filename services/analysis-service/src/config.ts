import { z } from "zod";
import {
  internalTokenSchema,
  optionalString,
  parseEnv,
} from "@mail-guard/service-kit";

const schema = z.object({
  PORT: z.coerce.number().int().default(4001),
  INTERNAL_SERVICE_TOKEN: internalTokenSchema,
  DECISION_ENGINE: z.enum(["auto", "jev", "llm", "heuristic"]).default("auto"),
  TYPESAFE_API_KEY: optionalString(),
  TYPESAFE_MODEL: optionalString(),
  AI_API_URL: optionalString(),
  AI_API_KEY: optionalString(),
  AI_MODEL: optionalString(),
  UPSTASH_REDIS_REST_URL: optionalString(),
  UPSTASH_REDIS_REST_TOKEN: optionalString(),
  CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),
});

export type AnalysisEnv = z.infer<typeof schema>;
export const loadConfig = (source?: Record<string, string | undefined>) =>
  parseEnv(schema, source);
