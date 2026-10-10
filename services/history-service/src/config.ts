import { z } from "zod";
import {
  internalTokenSchema,
  optionalString,
  parseEnv,
} from "@mail-guard/service-kit";

const schema = z.object({
  PORT: z.coerce.number().int().default(4002),
  INTERNAL_SERVICE_TOKEN: internalTokenSchema,
  SUPABASE_URL: optionalString(),
  SUPABASE_PUBLISHABLE_KEY: optionalString(),
});

export type HistoryEnv = z.infer<typeof schema>;
export const loadConfig = () => parseEnv(schema);
