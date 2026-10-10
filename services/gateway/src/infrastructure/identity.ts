import { createClient } from "@supabase/supabase-js";
import type { Logger } from "@mail-guard/service-kit";
import type { IdentityVerifier } from "../application/ports";

/**
 * Verifica el JWT con Supabase. getClaims valida la firma localmente (JWKS)
 * cuando el proyecto usa claves asimétricas y, si no, consulta a Supabase Auth.
 */
export function createSupabaseVerifier(
  config: { url: string; publishableKey: string },
  logger: Logger,
): IdentityVerifier {
  const supabase = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async verify(token) {
      try {
        const { data, error } = await supabase.auth.getClaims(token);
        const userId = data?.claims?.sub;
        return !error && userId ? { userId, token } : null;
      } catch (error) {
        logger.warn("token_verification_failed", { message: String(error) });
        return null;
      }
    },
  };
}

/** Sin Supabase configurado, todos los usuarios son anónimos. */
export const anonymousOnly: IdentityVerifier = { verify: async () => null };
