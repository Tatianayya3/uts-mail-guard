import "server-only";

import { createMailGuardApi } from "@mail-guard/api-client";

/** URL interna del gateway (solo servidor; no se expone al navegador). */
const gatewayUrl = process.env.API_GATEWAY_URL ?? "http://localhost:4000";

/** Cliente del API Gateway que actúa en nombre del usuario autenticado. */
export const apiFor = (accessToken: string) =>
  createMailGuardApi({
    baseUrl: gatewayUrl,
    getAccessToken: async () => accessToken,
    timeoutMs: 15_000,
  });
