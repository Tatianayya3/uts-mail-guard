import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
  type CounterConfiguration,
} from "prom-client";

/**
 * Métricas Prometheus de un microservicio. Cada servicio tiene su propio
 * registro (con la etiqueta `service`) para no mezclar métricas cuando varios
 * conviven en el mismo proceso, como en las pruebas de aceptación.
 */
export function createMetrics(service: string) {
  const registry = new Registry();
  registry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: registry });

  const requests = new Counter({
    name: "http_requests_total",
    help: "Peticiones HTTP atendidas.",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const duration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duración de las peticiones HTTP en segundos.",
    labelNames: ["method", "route"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  return {
    registry,
    observeRequest(
      method: string,
      route: string,
      status: number,
      seconds: number,
    ) {
      requests.inc({ method, route, status: String(status) });
      duration.observe({ method, route }, seconds);
    },
    /** Contador propio del servicio, registrado en este mismo registro. */
    counter<L extends string>(
      config: Omit<CounterConfiguration<L>, "registers">,
    ) {
      return new Counter<L>({ ...config, registers: [registry] });
    },
  };
}

export type Metrics = ReturnType<typeof createMetrics>;
