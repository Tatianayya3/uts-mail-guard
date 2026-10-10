import type { EmailSnapshot, ScanAnalysis } from "@mail-guard/contracts";
import type { Evidence } from "../domain/evidence";
import type { Decision } from "../domain/scoring";

/**
 * Puerto del motor de decisión. Cualquier proveedor (Jev, un LLM, reglas)
 * se conecta implementando esta interfaz; el caso de uso no los conoce.
 */
export interface DecisionEngine {
  readonly name: string;
  decide(email: EmailSnapshot, evidence: Evidence): Promise<Decision>;
}

/** Puerto de caché de análisis por huella del correo. */
export interface AnalysisCache {
  get(hash: string): Promise<ScanAnalysis | null>;
  set(hash: string, analysis: ScanAnalysis): Promise<void>;
}
