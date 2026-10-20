import { describe, expect, test } from "bun:test";
import { createLogger, createMetrics, createServiceApp } from "../src";

const silent = createLogger("test");
silent.info = () => {};

function appWith(options: Parameters<typeof createServiceApp>[2] = {}) {
  const app = createServiceApp("demo", silent, options);
  app.get("/v1/items/:id", (c) => c.json({ id: c.req.param("id") }));
  return app;
}

describe("GET /metrics", () => {
  test("expone peticiones y latencia en formato Prometheus", async () => {
    const app = appWith({ metricsToken: "" });
    await app.request("/v1/items/1");
    await app.request("/v1/items/2");

    const res = await app.request("/metrics");
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    // La ruta se agrupa por patrón, no por id.
    expect(body).toContain(
      'http_requests_total{method="GET",route="/v1/items/:id",status="200",service="demo"} 2',
    );
    expect(body).toContain("http_request_duration_seconds_bucket");
    expect(body).toContain("process_cpu_seconds_total");
  });

  test("no cuenta los sondeos de /health ni de /metrics", async () => {
    const app = appWith({ metricsToken: "" });
    await app.request("/health");
    await app.request("/metrics");
    const body = await (await app.request("/metrics")).text();
    expect(body).not.toContain('route="/health"');
    expect(body).not.toContain('route="/metrics"');
  });

  test("agrupa las rutas inexistentes como not_found", async () => {
    const app = appWith({ metricsToken: "" });
    await app.request("/no-existe/123");
    const body = await (await app.request("/metrics")).text();
    expect(body).toContain('route="not_found",status="404"');
  });

  test("con METRICS_TOKEN exige el token Bearer", async () => {
    const app = appWith({ metricsToken: "secreto" });
    expect((await app.request("/metrics")).status).toBe(401);
    const ok = await app.request("/metrics", {
      headers: { Authorization: "Bearer secreto" },
    });
    expect(ok.status).toBe(200);
  });

  test("acepta contadores propios del servicio en el mismo registro", async () => {
    const metrics = createMetrics("demo");
    const scans = metrics.counter({
      name: "demo_scans_total",
      help: "prueba",
      labelNames: ["verdict"],
    });
    scans.inc({ verdict: "phishing" });

    const app = appWith({ metrics, metricsToken: "" });
    const body = await (await app.request("/metrics")).text();
    expect(body).toContain(
      'demo_scans_total{verdict="phishing",service="demo"} 1',
    );
  });
});
