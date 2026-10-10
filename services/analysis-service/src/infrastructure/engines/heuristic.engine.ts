import type { DecisionEngine } from "../../application/ports";
import { heuristicDecision } from "../../domain/scoring";

/** Motor 100 % local y determinista. Permite probar todo sin claves de IA. */
export const heuristicEngine: DecisionEngine = {
  name: "mail-guard-heuristics-v1",
  decide: async (_email, evidence) => heuristicDecision(evidence),
};
