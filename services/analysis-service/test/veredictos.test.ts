/**
 * Veredictos y textos para el usuario. Casos reales:
 * - Un aviso legítimo de Supabase (con plazo) NO debe salir sospechoso.
 * - Un phishing clásico debe seguir saliendo peligroso.
 * Y en ambos, el texto habla en lenguaje natural: sin porcentajes ni jerga.
 */
import { describe, expect, test } from "bun:test";
import { scanAnalysisSchema, type EmailSnapshot } from "@mail-guard/contracts";
import { createLogger } from "@mail-guard/service-kit";
import { createAnalyzeEmail } from "../src/application/analyze-email";
import type { DecisionEngine } from "../src/application/ports";
import { createMemoryCache } from "../src/infrastructure/cache";
import { heuristicEngine } from "../src/infrastructure/engines/heuristic.engine";
import { createJevEngine } from "../src/infrastructure/engines/jev.engine";
import { phishingEmail } from "./fixtures";

const logger = createLogger("test");
logger.warn = () => {};

const supabaseNotice: EmailSnapshot = {
  provider: "Gmail",
  sender: "ant.wilson@supabase.com",
  senderName: "Supabase",
  subject: "Your Supabase Project ReciclaTIC is going to be paused.",
  bodyText:
    "Hi there, To save on cloud resources I just did a scan of all our projects and identified those which have not seen sufficient activity for more than 7 days. Your project ReciclaTIC from your organization UTS Org was one of those and it is scheduled to be paused in the near future. Your project is not currently paused, but if it continues not to receive sufficient activity, it will be paused automatically. You can unpause it from the dashboard within 90 days of the pause date. Beyond that point, you won't be able to unpause your project, but you'll be able to download your data. To prevent future automatic pausing, upgrade to Pro from your billing settings. Happy Hacking! Ant, CTO & Co-founder @ Supabase",
  links: [
    "https://supabase.link/HFIG8I8",
    "https://supabase.com/dashboard/project/aawoqemhbjnlwzfhtxys",
    "https://supabase.com/dashboard/org/_/billing",
    "https://supabase.com/docs/guides/platform/free-tier",
    "https://supabase.com/dashboard/support/new",
  ],
};

const choiceAnswer = (c: string, confidence: number) => ({
  type: "choice",
  choice: c,
  confidence,
  probabilities: {},
});

/** Jev simulado con las respuestas que dio en producción para el aviso. */
function jevLike(answers: Record<string, unknown>): DecisionEngine {
  return createJevEngine({
    apiKey: "test",
    model: "jev-1.14.0",
    fetch: (async () =>
      Response.json({
        model: "jev-1.14.0",
        usage: { input_tokens: 1, output_tokens: 1 },
        answers,
      })) as unknown as typeof fetch,
  });
}

const analyze = (engine: DecisionEngine, email: EmailSnapshot) =>
  createAnalyzeEmail({ engine, cache: createMemoryCache(60), logger })(email);

/** El texto para el usuario no expone probabilidades ni términos del modelo. */
function expectNaturalText(texts: string[]) {
  for (const text of texts) {
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(
      /\b(suspicious|dangerous|safe|Jev|probabilidad|confianza)\b/i,
    );
  }
}

describe("Aviso legítimo de Supabase", () => {
  test("con reglas: seguro, viene de Supabase y sus enlaces del mismo sitio", async () => {
    const { analysis } = await analyze(heuristicEngine, supabaseNotice);
    expect(analysis.verdict).toBe("safe");
    expect(analysis.trustScore).toBeGreaterThanOrEqual(70);
    expect(analysis.sender.domainStatus).toBe("valid");
    expect(analysis.links.every((l) => l.status === "safe")).toBe(true);
    expect(analysis.summary).toContain("Supabase");
    // «you won't be able» no es «you won» (premio): el contenido queda en verde.
    expect(analysis.signals.find((x) => x.key === "content")?.status).toBe(
      "pass",
    );
  });

  test("con Jev: aunque detecte urgencia, sale seguro y en lenguaje natural", async () => {
    const engine = jevLike({
      verdict: choiceAnswer("suspicious", 0.55),
      trust: {
        type: "score",
        score: 2.4,
        confidence: 0.6,
        legend: {},
        probabilities: {},
      },
      category: choiceAnswer("notice", 0.8),
      impersonation: { type: "noul", noul: 0.32 },
      pressure: { type: "noul", noul: 0.64 },
      sensitiveRequest: { type: "noul", noul: 0.12 },
      link_0: choiceAnswer("suspicious", 0.19),
      link_1: choiceAnswer("safe", 0.9),
      link_2: choiceAnswer("safe", 0.85),
      link_3: choiceAnswer("safe", 0.9),
      link_4: choiceAnswer("safe", 0.88),
    });
    const { analysis } = await analyze(engine, supabaseNotice);

    expect(scanAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(analysis.verdict).toBe("safe");
    expect(analysis.trustScore).toBeGreaterThanOrEqual(70);
    // Ningún enlace con alerta y la señal de enlaces coincide con la lista.
    expect(analysis.links.every((l) => l.status === "safe")).toBe(true);
    const links = analysis.signals.find((s) => s.key === "links")!;
    expect(links.status).toBe("pass");
    expect(links.value).toContain("mismo remitente");

    expect(analysis.summary).toStartWith(
      "Parece un aviso legítimo de Supabase.",
    );
    expect(analysis.summary).toContain("no te pide contraseñas");
    expect(analysis.advice).toContain("supabase.com");
    expectNaturalText([
      analysis.summary,
      analysis.advice,
      ...analysis.signals.flatMap((s) => [s.value, s.detail]),
      ...analysis.links.map((l) => l.detail),
    ]);
  });
});

describe("Phishing clásico", () => {
  test("con Jev sigue siendo peligroso, con razones concretas", async () => {
    const engine = jevLike({
      verdict: choiceAnswer("dangerous", 0.92),
      trust: {
        type: "score",
        score: 0.2,
        confidence: 0.9,
        legend: {},
        probabilities: {},
      },
      category: choiceAnswer("scam", 0.9),
      impersonation: { type: "noul", noul: 0.9 },
      pressure: { type: "noul", noul: 0.95 },
      sensitiveRequest: { type: "noul", noul: 0.93 },
      link_0: choiceAnswer("dangerous", 0.9),
      link_1: choiceAnswer("suspicious", 0.7),
    });
    const { analysis } = await analyze(engine, phishingEmail);
    expect(analysis.verdict).toBe("dangerous");
    expect(analysis.trustScore).toBeLessThan(40);
    expect(analysis.summary).toStartWith("Este correo parece una estafa:");
    expect(analysis.summary).toContain("Bancolombia");
    expectNaturalText([analysis.summary, analysis.advice]);
  });

  test("con reglas también, y las razones se leen naturales", async () => {
    const { analysis } = await analyze(heuristicEngine, phishingEmail);
    expect(analysis.verdict).toBe("dangerous");
    expect(analysis.signals.find((s) => s.key === "sender")?.value).toBe(
      "Se hace pasar por Bancolombia",
    );
    expect(analysis.advice).toContain("Repórtalo como phishing");
  });
});

describe("Coherencia del veredicto", () => {
  test("un «sospechoso» sin ninguna señal de alerta se corrige a seguro", async () => {
    const engine = jevLike({
      verdict: choiceAnswer("suspicious", 0.7),
      trust: {
        type: "score",
        score: 2,
        confidence: 0.5,
        legend: {},
        probabilities: {},
      },
      category: choiceAnswer("personal", 0.6),
      impersonation: { type: "noul", noul: 0.1 },
      pressure: { type: "noul", noul: 0.1 },
      sensitiveRequest: { type: "noul", noul: 0.05 },
    });
    const email: EmailSnapshot = {
      provider: "Gmail",
      sender: "profesor@uts.edu.co",
      senderName: "Profesor",
      subject: "Notas del parcial",
      bodyText:
        "Hola, ya están publicadas las notas del parcial en el aula virtual.",
      links: [],
    };
    const { analysis } = await analyze(engine, email);
    expect(analysis.verdict).toBe("safe");
    expect(analysis.trustScore).toBeGreaterThanOrEqual(70);
  });
});

describe("Dominios propios de la marca (supabase.help)", () => {
  test("un enlace con el nombre de la marca, desde su dominio oficial, no es alerta", async () => {
    const email: EmailSnapshot = {
      ...supabaseNotice,
      links: [...supabaseNotice.links, "https://supabase.help/"],
    };
    const engine = jevLike({
      verdict: choiceAnswer("safe", 0.7),
      trust: {
        type: "score",
        score: 3,
        confidence: 0.7,
        legend: {},
        probabilities: {},
      },
      category: choiceAnswer("notice", 0.8),
      impersonation: { type: "noul", noul: 0.1 },
      pressure: { type: "noul", noul: 0.6 },
      sensitiveRequest: { type: "noul", noul: 0.1 },
      // Jev duda del dominio .help, pero no con confianza alta.
      link_5: choiceAnswer("dangerous", 0.6),
    });
    const { analysis } = await analyze(engine, email);
    expect(analysis.verdict).toBe("safe");
    const help = analysis.links.find((l) => l.url === "https://supabase.help/");
    expect(help?.status).toBe("safe");
    expect(help?.detail).toContain("del mismo remitente");
  });
});
