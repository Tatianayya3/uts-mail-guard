import { NextResponse } from "next/server";

/** URL interna del gateway (la misma que usa el panel en el servidor). */
const gatewayUrl = (
  process.env.API_GATEWAY_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

// Cada llamada despierta los servicios de Render; el cliente repite hasta que
// los tres respondan. Corta antes del límite de las funciones de Vercel.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DOWN = {
  gateway: "down",
  analysis: "down",
  history: "down",
  engine: null,
};

/** Estado de los microservicios (público: no expone datos ni secretos). */
export async function GET() {
  try {
    const res = await fetch(`${gatewayUrl}/health/services`, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return NextResponse.json(DOWN);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(DOWN);
  }
}
