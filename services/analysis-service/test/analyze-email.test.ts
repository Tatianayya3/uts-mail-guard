import { describe, expect, test } from "bun:test";
import { createLogger } from "@mail-guard/service-kit";
import { scanAnalysisSchema } from "@mail-guard/contracts";
import { createAnalyzeEmail } from "../src/application/analyze-email";
import type { DecisionEngine } from "../src/application/ports";
import { createMemoryCache } from "../src/infrastructure/cache";
import { heuristicEngine } from "../src/infrastructure/engines/heuristic.engine";
import { legitEmail, phishingEmail } from "./fixtures";

const logger = createLogger("test");
logger.warn = () => {};

describe("analyzeEmail", () => {
  test("devuelve un análisis válido y lo cachea", async () => {
    const analyze = createAnalyzeEmail({
      engine: heuristicEngine,
      cache: createMemoryCache(60),
      logger,
    });
    const first = await analyze(phishingEmail);
    expect(scanAnalysisSchema.safeParse(first.analysis).success).toBe(true);
    expect(first.cached).toBe(false);
    expect(first.analysis.emailHash).toHaveLength(64);

    const second = await analyze(phishingEmail);
    expect(second.cached).toBe(true);
    expect(second.analysis.emailHash).toBe(first.analysis.emailHash);
  });

  test("si el motor falla, responde con el respaldo heurístico", async () => {
    const broken: DecisionEngine = {
      name: "broken",
      decide: async () => {
        throw new Error("proveedor caído");
      },
    };
    const analyze = createAnalyzeEmail({
      engine: broken,
      cache: createMemoryCache(60),
      logger,
    });
    const { analysis } = await analyze(phishingEmail);
    expect(analysis.model).toContain("respaldo");
    expect(analysis.verdict).toBe("dangerous");
  });

  test("las reglas objetivas no quedan tapadas por un modelo optimista", async () => {
    const naive: DecisionEngine = {
      name: "naive",
      decide: async () => ({
        trustScore: 95,
        verdict: "safe",
        model: "naive",
        links: [],
        signals: [
          {
            key: "sender",
            label: "Remitente",
            value: "ok",
            status: "pass",
            detail: "todo bien",
          },
        ],
      }),
    };
    const analyze = createAnalyzeEmail({
      engine: naive,
      cache: createMemoryCache(60),
      logger,
    });
    const { analysis } = await analyze(phishingEmail);
    expect(analysis.signals.find((s) => s.key === "sender")?.status).toBe(
      "fail",
    );
    expect(analysis.links.some((l) => l.status === "dangerous")).toBe(true);
  });

  test("usa la hora real del servidor", async () => {
    const now = new Date("2026-10-10T12:00:00.000Z");
    const analyze = createAnalyzeEmail({
      engine: heuristicEngine,
      cache: createMemoryCache(60),
      logger,
      now: () => now,
    });
    const { analysis } = await analyze(legitEmail);
    expect(analysis.analyzedAt).toBe(now.toISOString());
  });
});
