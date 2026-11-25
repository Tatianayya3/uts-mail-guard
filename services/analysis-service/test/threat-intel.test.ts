import { describe, expect, test } from "bun:test";
import { scanAnalysisSchema, type EmailSnapshot } from "@mail-guard/contracts";
import { createLogger } from "@mail-guard/service-kit";
import { createAnalyzeEmail } from "../src/application/analyze-email";
import { createMemoryCache } from "../src/infrastructure/cache";
import { heuristicEngine } from "../src/infrastructure/engines/heuristic.engine";

const logger = createLogger("test");
logger.warn = () => {};

/** Correo que, por sí solo, no tiene señales de phishing. */
const innocent: EmailSnapshot = {
  provider: "Gmail",
  sender: "boletin@ofertas-semanales.com",
  senderName: "Ofertas",
  subject: "Novedades de la semana",
  bodyText: "Mira las novedades de nuestra tienda esta semana.",
  links: ["https://ofertas-semanales.com/novedades"],
};

const analyzer = () =>
  createAnalyzeEmail({
    engine: heuristicEngine,
    cache: createMemoryCache(60),
    logger,
  });

describe("Analista + conocimiento del Centinela", () => {
  test("sin amenazas el veredicto no cambia", async () => {
    const { analysis } = await analyzer()(innocent, []);
    expect(analysis.verdict).toBe("safe");
    expect(analysis.model).not.toContain("centinela");
  });

  test("un remitente reportado como peligroso se marca peligroso", async () => {
    const { analysis } = await analyzer()(innocent, [
      { domain: "ofertas-semanales.com", level: "dangerous", reports: 4 },
    ]);
    expect(scanAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(analysis.verdict).toBe("dangerous");
    expect(analysis.trustScore).toBeLessThanOrEqual(15);
    const sender = analysis.signals.find((s) => s.key === "sender")!;
    expect(sender).toMatchObject({
      status: "fail",
      value: "Reportado por el agente Centinela",
    });
    expect(analysis.summary).toStartWith("Agente Centinela:");
    expect(analysis.model).toContain("+ centinela");
    expect(analysis.links[0]!.status).toBe("dangerous");
  });

  test("también coincide por dominio registrable (subdominios)", async () => {
    const { analysis } = await analyzer()(
      { ...innocent, sender: "x@mail.ofertas-semanales.com" },
      [{ domain: "ofertas-semanales.com", level: "suspicious", reports: 3 }],
    );
    expect(analysis.verdict).toBe("suspicious");
    expect(analysis.trustScore).toBeLessThanOrEqual(45);
  });

  test("un enlace a un dominio reportado empeora el resultado", async () => {
    const { analysis } = await analyzer()(
      { ...innocent, links: ["https://cobros-dian.co/pago"] },
      [{ domain: "cobros-dian.co", level: "dangerous", reports: 5 }],
    );
    expect(analysis.verdict).toBe("dangerous");
    expect(analysis.links[0]!.detail).toContain("Centinela");
  });

  test("el conocimiento se aplica también a un resultado en caché", async () => {
    const analyze = analyzer();
    const first = await analyze(innocent, []);
    expect(first.analysis.verdict).toBe("safe");
    const second = await analyze(innocent, [
      { domain: "ofertas-semanales.com", level: "dangerous", reports: 2 },
    ]);
    expect(second.cached).toBe(true);
    expect(second.analysis.verdict).toBe("dangerous");
  });
});
