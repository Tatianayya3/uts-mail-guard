import {
  AppError,
  INTERNAL_TOKEN_HEADER,
  REQUEST_ID_HEADER,
  unavailable,
} from "@mail-guard/service-kit";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ServiceClient } from "../application/ports";

/**
 * Códigos que devuelve el proxy de la plataforma (sin nuestro JSON) mientras el
 * servicio despierta. Render también responde 429 durante el arranque en frío.
 */
const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);

type RetryOptions = {
  /** Intentos totales (1 = sin reintentos). */
  attempts?: number;
  /** Espera base entre intentos; crece de forma lineal (1×, 2×…). */
  delayMs?: number;
};

/**
 * Cliente HTTP hacia un microservicio interno. Adjunta el token interno,
 * propaga el request-id y el JWT, y traduce los errores a AppError.
 *
 * En el plan free de Render cada servicio se duerme por separado: el gateway
 * puede despertar antes que history/analysis y recibir un 429/502/503 del proxy
 * (sin el JSON de nuestros servicios) o un fallo de conexión. Esos casos se
 * reintentan; los errores reales de la aplicación (con JSON) y los timeouts no.
 */
export function createServiceClient(
  name: string,
  baseUrl: string,
  internalToken: string,
  timeoutMs = 25_000,
  { attempts = 3, delayMs = 1_500 }: RetryOptions = {},
): ServiceClient {
  const root = baseUrl.replace(/\/+$/, "");
  return {
    async request(path, init = {}) {
      for (let attempt = 1; ; attempt++) {
        const isLast = attempt >= attempts;
        let response: Response;
        try {
          response = await fetch(`${root}${path}`, {
            method: init.method ?? "GET",
            headers: {
              [INTERNAL_TOKEN_HEADER]: internalToken,
              ...(init.requestId
                ? { [REQUEST_ID_HEADER]: init.requestId }
                : {}),
              ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
              ...(init.body !== undefined
                ? { "Content-Type": "application/json" }
                : {}),
            },
            body:
              init.body !== undefined ? JSON.stringify(init.body) : undefined,
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch (error) {
          const timedOut =
            error instanceof DOMException && error.name === "TimeoutError";
          if (!isLast && !timedOut) {
            await wait(delayMs * attempt);
            continue;
          }
          throw unavailable(
            `El servicio ${name} no está disponible en este momento.`,
          );
        }

        const payload: unknown = await response.json().catch(() => null);
        if (response.ok) return payload as never;

        const appError =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : null;

        // Respuesta del proxy (sin JSON nuestro) mientras el servicio despierta.
        if (!appError && TRANSIENT_STATUS.has(response.status)) {
          if (!isLast) {
            await wait(delayMs * attempt);
            continue;
          }
          throw unavailable(
            `El servicio ${name} se está iniciando. Intenta de nuevo en unos segundos.`,
          );
        }

        // Los 4xx se propagan tal cual; los 5xx se exponen como 502.
        const status = (
          response.status < 500 ? response.status : 502
        ) as ContentfulStatusCode;
        throw new AppError(
          status,
          appError ?? `El servicio ${name} falló.`,
          `${name}_error`,
        );
      }
    },
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
