import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Error de aplicación con un mensaje apto para el usuario final. Cualquier
 * otro error se registra y se responde como 500 genérico.
 */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
    readonly code = "app_error",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string) =>
  new AppError(400, message, "bad_request");
export const unauthorized = (message = "Autenticación requerida.") =>
  new AppError(401, message, "unauthorized");
export const tooManyRequests = (message: string) =>
  new AppError(429, message, "rate_limited");
export const unavailable = (message: string) =>
  new AppError(503, message, "unavailable");
