/**
 * MICROSERVICIO Analizador: levanta el servidor HTTP y conecta los
 * endpoints con el microservicio Historial.
 *
 *   bun microservicios-demo/analizador/microservicio.ts
 */
import { crearEndpoints, type Registrar } from "./endpoint";

const PUERTO = Number(process.env.PORT ?? 5001);
const HISTORIAL_URL = process.env.HISTORIAL_URL ?? "http://localhost:5002";

/** Comunicación entre microservicios: HTTP + JSON. */
const registrarEnHistorial: Registrar = async (analisis) => {
  const respuesta = await fetch(`${HISTORIAL_URL}/historial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      remitente: analisis.remitente,
      veredicto: analisis.veredicto,
      puntaje: analisis.puntaje,
    }),
  });
  return respuesta.ok;
};

const servidor = Bun.serve({
  port: PUERTO,
  fetch: crearEndpoints(registrarEnHistorial),
});

console.log(
  `Analizador escuchando en ${servidor.url} (historial: ${HISTORIAL_URL})`,
);
