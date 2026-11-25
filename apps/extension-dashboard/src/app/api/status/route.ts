import { NextResponse } from "next/server";

const trim = (url: string) => url.replace(/\/+$/, "");
const production = process.env.NODE_ENV === "production";

/** URL del gateway (la misma que usa el panel en el servidor). */
const gatewayUrl = trim(process.env.API_GATEWAY_URL ?? "http://localhost:4000");

/**
 * URLs públicas de los servicios internos, solo para despertarlos con su
 * /health. En Render, mientras un servicio duerme, las llamadas del gateway
 * pueden fallar varios minutos; una petición directa lo despierta en ~20 s.
 */
const directUrls = {
  analysis: trim(
    process.env.ANALYSIS_SERVICE_URL ??
      (production
        ? "https://mail-guard-analysis-96pk.onrender.com"
        : "http://localhost:4001"),
  ),
  history: trim(
    process.env.HISTORY_SERVICE_URL ??
      (production
        ? "https://mail-guard-history-bwiv.onrender.com"
        : "http://localhost:4002"),
  ),
};

// Cada llamada despierta los servicios; el cliente repite hasta que los tres
// respondan. Corta antes del límite de las funciones de Vercel.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Health = "ok" | "down";
const TIMEOUT_MS = 25_000;

async function ping(url: string): Promise<Health> {
  try {
    const res = await fetch(`${url}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

async function viaGateway(): Promise<{
  gateway: Health;
  analysis: Health;
  history: Health;
  engine: string | null;
} | null> {
  try {
    const res = await fetch(`${gatewayUrl}/health/services`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Estado de los microservicios (público: no expone datos ni secretos). El
 * estado es el que ve el gateway, que es el que importa para el panel; los
 * /health directos solo sirven para despertar los servicios dormidos.
 */
export async function GET() {
  const [gateway] = await Promise.all([
    viaGateway(),
    ping(directUrls.analysis),
    ping(directUrls.history),
  ]);
  return NextResponse.json(
    gateway ?? {
      gateway: "down",
      analysis: "down",
      history: "down",
      engine: null,
    },
  );
}
