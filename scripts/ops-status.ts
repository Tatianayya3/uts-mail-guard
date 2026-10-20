/**
 * Fase OPERATE: revisa (y despierta) los 3 microservicios.
 *
 *   bun run ops:status            → producción (Render)
 *   bun run ops:status --local    → localhost:4000-4002
 *
 * En el plan free, Render duerme los servicios tras 15 min sin tráfico; la
 * primera petición tarda ~1 min en despertarlos, por eso el timeout es largo.
 * También lo usa .github/workflows/wake.yml (resumen en GITHUB_STEP_SUMMARY).
 */
import { appendFileSync } from "node:fs";

const local = process.argv.includes("--local");

const services = local
  ? {
      gateway: "http://localhost:4000",
      analysis: "http://localhost:4001",
      history: "http://localhost:4002",
    }
  : {
      gateway:
        process.env.GATEWAY_URL ?? "https://mail-guard-gateway.onrender.com",
      analysis:
        process.env.ANALYSIS_URL ?? "https://mail-guard-analysis.onrender.com",
      history:
        process.env.HISTORY_URL ?? "https://mail-guard-history.onrender.com",
    };

const TIMEOUT_MS = local ? 5_000 : 120_000;

type Check = {
  name: string;
  url: string;
  ok: boolean;
  ms: number;
  detail: string;
};

async function check(name: string, base: string): Promise<Check> {
  const url = `${base}/health`;
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = (await res.json().catch(() => ({}))) as { uptime?: number };
    return {
      name,
      url,
      ok: res.ok,
      ms: Math.round(performance.now() - started),
      detail: res.ok ? `uptime ${body.uptime ?? "?"} s` : `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      ms: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

console.log(`Revisando ${local ? "local" : "producción (Render)"}…\n`);
// En paralelo: así los tres despiertan a la vez.
const results = await Promise.all(
  Object.entries(services).map(([name, url]) => check(name, url)),
);

const engine = await fetch(`${services.gateway}/health/services`, {
  signal: AbortSignal.timeout(TIMEOUT_MS),
})
  .then((r) => r.json() as Promise<{ engine?: string | null }>)
  .then((r) => r.engine ?? "—")
  .catch(() => "—");

console.table(
  results.map((r) => ({
    servicio: r.name,
    estado: r.ok ? "✅ ok" : "❌ caído",
    "tiempo (ms)": r.ms,
    detalle: r.detail,
  })),
);
console.log(`Motor de análisis: ${engine}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results
    .map(
      (r) =>
        `| ${r.name} | ${r.ok ? "✅ ok" : "❌ caído"} | ${r.ms} ms | ${r.detail} |`,
    )
    .join("\n");
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Estado de Mail Guard\n\n| Servicio | Estado | Respuesta | Detalle |\n|---|---|---|---|\n${rows}\n\nMotor de análisis: **${engine}**\n`,
  );
}

process.exit(results.every((r) => r.ok) ? 0 : 1);
