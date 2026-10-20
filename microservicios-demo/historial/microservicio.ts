/**
 * MICROSERVICIO Historial: levanta el servidor HTTP con sus endpoints.
 *
 *   bun microservicios-demo/historial/microservicio.ts
 */
import { crearEndpoints } from "./endpoint";

const PUERTO = Number(process.env.PORT ?? 5002);

const servidor = Bun.serve({
  port: PUERTO,
  fetch: crearEndpoints(),
});

console.log(`Historial escuchando en ${servidor.url}`);
