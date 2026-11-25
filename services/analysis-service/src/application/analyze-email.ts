import {
  scanAnalysisSchema,
  type EmailSnapshot,
  type ScanAnalysis,
  type ThreatIntel,
} from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import { collectEvidence, type Evidence } from "../domain/evidence";
import { narrateAdvice, narrateSummary } from "../domain/narrative";
import {
  domainStatusOf,
  heuristicDecision,
  linksSignal,
  mergeLinks,
  mergeSignals,
  reconcileVerdict,
  type Decision,
} from "../domain/scoring";
import { applyThreatIntel, matchThreats } from "../domain/threat-intel";
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
 * 5. Consulta la base de conocimiento del agente Centinela (también sobre un
 *    resultado en caché, porque una campaña puede detectarse después).
 */
export function createAnalyzeEmail({
  engine,
  cache,
  logger,
  now = () => new Date(),
}: Dependencies) {
  return async function analyzeEmail(
    email: EmailSnapshot,
    threats: ThreatIntel[] = [],
  ): Promise<AnalyzeEmailResult> {
    const emailHash = computeEmailHash(email);
    const withIntel = (analysis: ScanAnalysis) =>
      applyThreatIntel(analysis, matchThreats(analysis, threats));

    const cached = await cache.get(emailHash);
    if (cached)
      return { analysis: withIntel({ ...cached, emailHash }), cached: true };

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

    // En caché va el análisis propio; el conocimiento del Centinela se aplica al salir.
    await cache.set(emailHash, parsed.data);
    return { analysis: withIntel(parsed.data), cached: false };
  };
}

function compose(
  email: EmailSnapshot,
  evidence: Evidence,
  decision: Decision,
  baseline: Decision,
  analyzedAt: Date,
): ScanAnalysis {
  const links = mergeLinks(decision.links, baseline.links);
  // La señal de enlaces se recalcula con los enlaces FINALES (modelo + reglas):
  // así nunca dice «sin alertas» mientras la lista muestra un enlace marcado.
  const signals = mergeSignals(decision.signals, baseline.signals).map((s) =>
    s.key === "links" ? linksSignal(evidence, links) : s,
  );
  const { verdict, trustScore } = reconcileVerdict({
    verdict: evidence.hasContent ? decision.verdict : "unknown",
    trustScore: decision.trustScore,
    signals,
    links,
    baseline,
  });
  const narrative = {
    verdict,
    evidence,
    signals,
    links,
    notes: decision.notes,
  };
  return {
    trustScore,
    verdict,
    summary: (decision.summary ?? narrateSummary(narrative)).slice(0, 500),
    advice: (decision.advice ?? narrateAdvice(narrative)).slice(0, 300),
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
    links,
    model: decision.model.slice(0, 100),
    // Siempre la hora real del servidor: los modelos no saben qué hora es.
    analyzedAt: analyzedAt.toISOString(),
  };
}
