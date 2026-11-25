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
  const wake = (url: string, init?: RequestInit) =>
    void fetch(url, { ...init, signal: AbortSignal.timeout(90_000) }).catch(
      () => {},
    );
  if (env.apiGatewayUrl) wake(`${env.apiGatewayUrl}/health/services`);
  // El panel despierta además cada servicio por su URL directa (más rápido
  // que pasar por el gateway). no-cors: solo importa que la petición llegue.
  if (env.dashboardUrl)
    wake(`${env.dashboardUrl}/api/status`, { mode: "no-cors" });
}
