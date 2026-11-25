import { createMailGuardApi } from "@mail-guard/api-client";
import { env } from "@/config/env";
import { auth } from "./supabase";

/** Única puerta de salida hacia el backend: el API Gateway. */
export const api = createMailGuardApi({
  baseUrl: env.apiGatewayUrl,
  getAccessToken: auth.getAccessToken,
});

/**
 * Despierta los microservicios (plan free de Render) en cuanto se abre el
 * popup, para que al pulsar «Escanear» ya estén activos. No bloquea nada.
 */
export function wakeServices(): void {
  if (!env.apiGatewayUrl) return;
  void fetch(`${env.apiGatewayUrl}/health/services`, {
    signal: AbortSignal.timeout(90_000),
  }).catch(() => {});
}
