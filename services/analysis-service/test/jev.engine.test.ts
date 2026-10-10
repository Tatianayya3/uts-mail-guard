import { describe, expect, test } from "bun:test";
import { collectEvidence } from "../src/domain/evidence";
import { createJevEngine } from "../src/infrastructure/engines/jev.engine";
import { phishingEmail } from "./fixtures";

const choiceAnswer = (choice: string, confidence: number) => ({
  type: "choice",
  choice,
  confidence,
  probabilities: {},
});

describe("Jev engine", () => {
  test("envía preguntas tipadas y traduce probabilidades a señales", async () => {
    let sentBody: Record<string, unknown> = {};
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return Response.json({
        model: "jev-1",
        usage: { input_tokens: 10, output_tokens: 2 },
        answers: {
          verdict: choiceAnswer("dangerous", 0.91),
          trust: {
            type: "score",
            score: 0.4,
            confidence: 0.8,
            legend: {},
            probabilities: {},
          },
          impersonation: { type: "noul", noul: 0.88 },
          pressure: { type: "noul", noul: 0.7 },
          sensitiveRequest: { type: "noul", noul: 0.93 },
          link_0: choiceAnswer("dangerous", 0.9),
          link_1: choiceAnswer("suspicious", 0.6),
        },
      });
    }) as typeof fetch;

    const engine = createJevEngine({
      apiKey: "test",
      model: "jev-1",
      fetch: fakeFetch,
    });
    const decision = await engine.decide(
      phishingEmail,
      collectEvidence(phishingEmail),
    );

    const questions = sentBody.questions as Record<string, { type: string }>;
    expect(questions.verdict?.type).toBe("choice");
    expect(questions.trust?.type).toBe("score");
    expect(questions.impersonation?.type).toBe("noul");
    expect(Object.keys(questions)).toContain("link_1");

    expect(decision.verdict).toBe("dangerous");
    expect(decision.trustScore).toBeLessThan(20);
    expect(decision.signals.find((s) => s.key === "sender")?.status).toBe(
      "fail",
    );
    expect(decision.links.map((l) => l.status)).toEqual([
      "dangerous",
      "suspicious",
    ]);
    expect(decision.model).toBe("jev-1");
  });

  test("con poca confianza, el veredicto sale del puntaje combinado", async () => {
    const fakeFetch = (async () =>
      Response.json({
        model: "jev-1",
        usage: { input_tokens: 1, output_tokens: 1 },
        answers: {
          verdict: choiceAnswer("safe", 0.34),
          trust: {
            type: "score",
            score: 2,
            confidence: 0.4,
            legend: {},
            probabilities: {},
          },
          impersonation: { type: "noul", noul: 0.5 },
          pressure: { type: "noul", noul: 0.5 },
          sensitiveRequest: { type: "noul", noul: 0.5 },
        },
      })) as unknown as typeof fetch;
    const engine = createJevEngine({ apiKey: "test", fetch: fakeFetch });
    const email = { ...phishingEmail, links: [] };
    const decision = await engine.decide(email, collectEvidence(email));
    expect(decision.verdict).not.toBe("safe");
  });
});
