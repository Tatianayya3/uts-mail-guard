/**
 * ENDPOINTS del microservicio Analizador.
 *
 *   GET  /health    → estado del servicio
 *   POST /analizar  → valida el correo, calcula un puntaje de riesgo y
 *                     registra el resultado en el microservicio Historial
 */
import { validarCorreo, type Correo } from "./validador";

export type Veredicto = "seguro" | "sospechoso" | "phishing";

export type Analisis = {
  remitente: string;
  asunto: string;
  puntaje: number;
  veredicto: Veredicto;
  senales: string[];
};

/** Quién guarda el análisis (en producción: el microservicio Historial). */
export type Registrar = (analisis: Analisis) => Promise<boolean>;

const PALABRAS_URGENTES = [
  "urgente",
  "verifica tu cuenta",
  "contraseña",
  "suspendida",
  "premio",
  "haz clic",
  "transferencia",
];
const DOMINIOS_GRATUITOS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
];

/** Reglas simples de detección: cada señal suma puntos de riesgo (0-100). */
export function analizar(correo: Correo): Analisis {
  const texto = `${correo.asunto} ${correo.cuerpo}`.toLowerCase();
  const senales: string[] = [];
  let puntaje = 0;

  for (const palabra of PALABRAS_URGENTES) {
    if (texto.includes(palabra)) {
      senales.push(`Usa lenguaje de presión: "${palabra}"`);
      puntaje += 15;
    }
  }

  const enlaces = correo.cuerpo.match(/https?:\/\/[^\s]+/g) ?? [];
  if (enlaces.some((url) => /https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url))) {
    senales.push("Tiene enlaces a direcciones IP");
    puntaje += 30;
  }
  if (enlaces.length > 3) {
    senales.push(`Tiene muchos enlaces (${enlaces.length})`);
    puntaje += 10;
  }

  const [usuario = "", dominio = ""] = correo.remitente.split("@");
  if (
    DOMINIOS_GRATUITOS.includes(dominio) &&
    /banco|soporte|seguridad/.test(`${usuario} ${texto}`)
  ) {
    senales.push(`Se presenta como entidad pero escribe desde ${dominio}`);
    puntaje += 25;
  }

  puntaje = Math.min(puntaje, 100);
  const veredicto: Veredicto =
    puntaje >= 60 ? "phishing" : puntaje >= 30 ? "sospechoso" : "seguro";

  return {
    remitente: correo.remitente,
    asunto: correo.asunto,
    puntaje,
    veredicto,
    senales,
  };
}

export function crearEndpoints(registrar: Registrar) {
  return async function manejar(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    if (req.method === "GET" && pathname === "/health") {
      return Response.json({ estado: "ok", servicio: "analizador" });
    }

    if (req.method === "POST" && pathname === "/analizar") {
      const body = await req.json().catch(() => null);
      const validacion = validarCorreo(body);
      if (!validacion.ok) {
        return Response.json({ errores: validacion.errores }, { status: 400 });
      }

      const analisis = analizar(validacion.datos);
      // Si el Historial está caído el análisis igual se entrega.
      const guardado = await registrar(analisis).catch(() => false);
      return Response.json({ ...analisis, guardado });
    }

    return Response.json({ error: "Ruta no encontrada." }, { status: 404 });
  };
}
