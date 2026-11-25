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
  /** Clave secreta (service_role): solo la usa el agente Centinela. */
  SUPABASE_SECRET_KEY: optionalString(),
  /** Cada cuántos minutos el Centinela ejecuta un ciclo automático. */
  SENTINEL_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(30),
});

export type HistoryEnv = z.infer<typeof schema>;
export const loadConfig = () => parseEnv(schema);
