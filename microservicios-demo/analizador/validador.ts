/**
 * VALIDADOR del microservicio Analizador.
 *
 * Revisa que el cuerpo de la petición traiga un correo bien formado antes de
 * analizarlo. Si algo falla, devuelve la lista de errores para responder 400.
 */

export type Correo = {
  remitente: string;
  asunto: string;
  cuerpo: string;
};

export type Validacion =
  { ok: true; datos: Correo } | { ok: false; errores: string[] };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CUERPO = 20_000;

export function validarCorreo(body: unknown): Validacion {
  if (typeof body !== "object" || body === null) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto JSON."] };
  }

  const { remitente, asunto, cuerpo } = body as Record<string, unknown>;
  const errores: string[] = [];

  if (typeof remitente !== "string" || !EMAIL.test(remitente)) {
    errores.push("'remitente' debe ser un correo válido.");
  }
  if (typeof asunto !== "string") {
    errores.push("'asunto' debe ser texto.");
  }
  if (typeof cuerpo !== "string" || cuerpo.trim() === "") {
    errores.push("'cuerpo' es obligatorio.");
  } else if (cuerpo.length > MAX_CUERPO) {
    errores.push(`'cuerpo' no puede superar ${MAX_CUERPO} caracteres.`);
  }

  if (errores.length > 0) return { ok: false, errores };
  return {
    ok: true,
    datos: {
      remitente: (remitente as string).toLowerCase(),
      asunto: (asunto as string).trim(),
      cuerpo: cuerpo as string,
    },
  };
}
