/**
 * VALIDADOR del microservicio Historial.
 *
 * Revisa que el registro que llega del Analizador tenga remitente, veredicto
 * y puntaje válidos antes de guardarlo.
 */

export type Registro = {
  remitente: string;
  veredicto: "seguro" | "sospechoso" | "phishing";
  puntaje: number;
};

export type Validacion =
  { ok: true; datos: Registro } | { ok: false; errores: string[] };

const VEREDICTOS = ["seguro", "sospechoso", "phishing"];

export function validarRegistro(body: unknown): Validacion {
  if (typeof body !== "object" || body === null) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto JSON."] };
  }

  const { remitente, veredicto, puntaje } = body as Record<string, unknown>;
  const errores: string[] = [];

  if (typeof remitente !== "string" || !remitente.includes("@")) {
    errores.push("'remitente' debe ser un correo.");
  }
  if (typeof veredicto !== "string" || !VEREDICTOS.includes(veredicto)) {
    errores.push(`'veredicto' debe ser uno de: ${VEREDICTOS.join(", ")}.`);
  }
  if (
    typeof puntaje !== "number" ||
    !Number.isInteger(puntaje) ||
    puntaje < 0 ||
    puntaje > 100
  ) {
    errores.push("'puntaje' debe ser un entero entre 0 y 100.");
  }

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, datos: { remitente, veredicto, puntaje } as Registro };
}
