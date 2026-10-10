import { z } from "zod";

/** Valida variables de entorno al arrancar: si falta algo, falla temprano y claro. */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined> = process.env,
): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuración inválida:\n${details}`);
  }
  return result.data;
}

/** Cadena opcional donde "" cuenta como ausente (típico en .env). */
export const optionalString = () =>
  z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined));

export const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Token compartido entre gateway y servicios internos. En desarrollo hay un
 * valor por defecto para que todo arranque sin configurar nada.
 */
export const internalTokenSchema = optionalString().transform((value, ctx) => {
  if (value) return value;
  if (isProduction()) {
    ctx.addIssue({
      code: "custom",
      message: "INTERNAL_SERVICE_TOKEN es obligatorio en producción",
    });
    return z.NEVER;
  }
  return "dev-internal-token";
});
