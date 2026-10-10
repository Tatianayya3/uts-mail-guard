import { createMailGuardApi } from "@mail-guard/api-client";
import { env } from "@/config/env";
import { auth } from "./supabase";

/** Única puerta de salida hacia el backend: el API Gateway. */
export const api = createMailGuardApi({
  baseUrl: env.apiGatewayUrl,
  getAccessToken: auth.getAccessToken,
});
