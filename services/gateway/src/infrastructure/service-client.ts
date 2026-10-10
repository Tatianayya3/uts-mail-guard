import {
  AppError,
  INTERNAL_TOKEN_HEADER,
  REQUEST_ID_HEADER,
  unavailable,
} from "@mail-guard/service-kit";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ServiceClient } from "../application/ports";

/**
 * Cliente HTTP hacia un microservicio interno. Adjunta el token interno,
 * propaga el request-id y el JWT, y traduce los errores a AppError.
 */
export function createServiceClient(
  name: string,
  baseUrl: string,
  internalToken: string,
  timeoutMs = 25_000,
): ServiceClient {
  const root = baseUrl.replace(/\/+$/, "");
  return {
    async request(path, init = {}) {
      let response: Response;
      try {
        response = await fetch(`${root}${path}`, {
          method: init.method ?? "GET",
          headers: {
            [INTERNAL_TOKEN_HEADER]: internalToken,
            ...(init.requestId ? { [REQUEST_ID_HEADER]: init.requestId } : {}),
            ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
            ...(init.body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          },
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw unavailable(
          "Mail Guard no está disponible en este momento. Inténtalo de nuevo en unos minutos.",
        );
      }

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Algo falló en el servidor. Inténtalo de nuevo en unos minutos.";
        // Los 4xx se propagan tal cual; los 5xx se exponen como 502.
        const status = (
          response.status < 500 ? response.status : 502
        ) as ContentfulStatusCode;
        throw new AppError(status, message, `${name}_error`);
      }
      return payload as never;
    },
  };
}
