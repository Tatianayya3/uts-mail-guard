/**
 * ENDPOINTS del microservicio Historial.
 *
 *   GET  /health     → estado del servicio
 *   POST /historial  → valida y guarda un análisis
 *   GET  /historial  → lista los análisis guardados y un resumen por veredicto
 */
import { validarRegistro, type Registro } from "./validador";

export type Guardado = Registro & { id: number; fecha: string };

/** Almacenamiento en memoria: se reinicia al apagar el microservicio. */
export function crearEndpoints() {
  const registros: Guardado[] = [];

  return async function manejar(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    if (req.method === "GET" && pathname === "/health") {
      return Response.json({
        estado: "ok",
        servicio: "historial",
        registros: registros.length,
      });
    }

    if (req.method === "POST" && pathname === "/historial") {
      const body = await req.json().catch(() => null);
      const validacion = validarRegistro(body);
      if (!validacion.ok) {
        return Response.json({ errores: validacion.errores }, { status: 400 });
      }

      const registro: Guardado = {
        id: registros.length + 1,
        fecha: new Date().toISOString(),
        ...validacion.datos,
      };
      registros.push(registro);
      return Response.json(registro, { status: 201 });
    }

    if (req.method === "GET" && pathname === "/historial") {
      const resumen = { seguro: 0, sospechoso: 0, phishing: 0 };
      for (const r of registros) resumen[r.veredicto]++;
      return Response.json({ total: registros.length, resumen, registros });
    }

    return Response.json({ error: "Ruta no encontrada." }, { status: 404 });
  };
}
