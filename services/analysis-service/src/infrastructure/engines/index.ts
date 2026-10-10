import type { Logger } from "@mail-guard/service-kit";
import type { DecisionEngine } from "../../application/ports";
import type { AnalysisEnv } from "../../config";
import { heuristicEngine } from "./heuristic.engine";
import { createJevEngine } from "./jev.engine";
import { createLlmEngine } from "./llm.engine";

/**
 * Elige el motor según DECISION_ENGINE. En "auto": Jev si hay clave de
 * TypeSafe, si no un LLM compatible con OpenAI, y si no, reglas locales.
 */
export function createDecisionEngine(
  env: AnalysisEnv,
  logger: Logger,
): DecisionEngine {
  const jev = env.TYPESAFE_API_KEY
    ? () =>
        createJevEngine({
          apiKey: env.TYPESAFE_API_KEY!,
          model: env.TYPESAFE_MODEL,
        })
    : null;
  const llm =
    env.AI_API_KEY && env.AI_API_URL && env.AI_MODEL
      ? () =>
          createLlmEngine({
            apiKey: env.AI_API_KEY!,
            apiUrl: env.AI_API_URL!,
            model: env.AI_MODEL!,
          })
      : null;

  const requested = env.DECISION_ENGINE;
  const factory =
    requested === "jev"
      ? jev
      : requested === "llm"
        ? llm
        : requested === "heuristic"
          ? () => heuristicEngine
          : (jev ?? llm ?? (() => heuristicEngine));

  if (!factory) {
    logger.warn("engine_not_configured", {
      requested,
      using: heuristicEngine.name,
    });
    return heuristicEngine;
  }
  const engine = factory();
  logger.info("engine_selected", { requested, using: engine.name });
  return engine;
}
