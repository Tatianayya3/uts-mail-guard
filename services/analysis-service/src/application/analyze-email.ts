import {
  scanAnalysisSchema,
  type EmailSnapshot,
  type ScanAnalysis,
} from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import { collectEvidence, type Evidence } from "../domain/evidence";
import { buildAdvice, buildSummary } from "../domain/narrative";
import {
  clampScore,
  domainStatusOf,
  heuristicDecision,
  mergeLinks,
  mergeSignals,
  type Decision,
} from "../domain/scoring";
import { computeEmailHash } from "./email-hash";
import type { AnalysisCache, DecisionEngine } from "./ports";

export type AnalyzeEmailResult = { analysis: ScanAnalysis; cached: boolean };

type Dependencies = {
  engine: DecisionEngine;
  cache: AnalysisCache;
  logger: Logger;
  now?: () => Date;
};

/**
 * Caso de uso UC-01 «Analizar correo».
 * 1. Busca en caché por huella. 2. Extrae evidencias objetivas.
 * 3. Pide la decisión al motor (con respaldo heurístico si falla).
 * 4. Combina modelo + reglas, valida el contrato y lo guarda en caché.
 */
export function createAnalyzeEmail({
  engine,
  cache,
  logger,
  now = () => new Date(),
}: Dependencies) {
  return async function analyzeEmail(
    email: EmailSnapshot,
  ): Promise<AnalyzeEmailResult> {
    const emailHash = computeEmailHash(email);

    const cached = await cache.get(emailHash);
    if (cached) return { analysis: { ...cached, emailHash }, cached: true };

    const evidence = collectEvidence(email);
    const baseline = heuristicDecision(evidence);

    let decision: Decision = baseline;
    if (engine.name !== baseline.model) {
      try {
        decision = await engine.decide(email, evidence);
      } catch (error) {
        logger.warn("engine_failed_fallback_to_heuristics", {
          engine: engine.name,
          message: error instanceof Error ? error.message : String(error),
        });
        decision = { ...baseline, model: `${baseline.model} (respaldo)` };
      }
    }

    const analysis = compose(email, evidence, decision, baseline, now());
    const parsed = scanAnalysisSchema.safeParse({ ...analysis, emailHash });
    if (!parsed.success) {
      logger.error("analysis_contract_failed", {
        issues: parsed.error.issues.slice(0, 5),
      });
      throw new Error("El análisis no cumple el contrato esperado.");
    }

    await cache.set(emailHash, parsed.data);
    return { analysis: parsed.data, cached: false };
  };
}

function compose(
  email: EmailSnapshot,
  evidence: Evidence,
  decision: Decision,
  baseline: Decision,
  analyzedAt: Date,
): ScanAnalysis {
  const signals = mergeSignals(decision.signals, baseline.signals);
  const verdict = evidence.hasContent ? decision.verdict : "unknown";
  return {
    trustScore: clampScore(decision.trustScore),
    verdict,
    summary: (decision.summary ?? buildSummary(verdict, signals)).slice(0, 500),
    advice: (decision.advice ?? buildAdvice(verdict)).slice(0, 300),
    sender: {
      email: email.sender,
      domain: evidence.senderDomain || "desconocido",
      domainStatus: decision.domainStatus ?? domainStatusOf(evidence),
      displayName: (
        evidence.senderName ||
        email.sender.split("@")[0] ||
        "Remitente"
      ).slice(0, 200),
    },
    signals,
    links: mergeLinks(decision.links, baseline.links),
    model: decision.model.slice(0, 100),
    // Siempre la hora real del servidor: los modelos no saben qué hora es.
    analyzedAt: analyzedAt.toISOString(),
  };
}
