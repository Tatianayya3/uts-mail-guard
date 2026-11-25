import type {
  AgentAlert,
  AgentRun,
  ThreatDomain,
  ThreatLevel,
} from "@mail-guard/contracts";
import type { Observation } from "./policy";

/**
 * Sensores y actuadores del Centinela sobre los datos de TODOS los usuarios.
 * La implementación usa la clave secreta del servicio, pero solo expone
 * conteos agregados por dominio (nunca asuntos, textos ni direcciones).
 */
export interface SentinelRepository {
  /** Sensor: análisis agregados por dominio desde `since`. */
  observe(since: Date): Promise<Observation[]>;
  /** Creencias: base de conocimiento actual. */
  listThreats(options?: {
    activeOnly?: boolean;
    limit?: number;
  }): Promise<ThreatDomain[]>;
  /** Actuador: publica o actualiza un dominio en la base de conocimiento. */
  upsertThreat(threat: ThreatDomain): Promise<void>;
  /** Actuador: retira un dominio de la base de conocimiento. */
  retireThreat(domain: string): Promise<void>;
  /** Actuador: avisa a los usuarios que recibieron correos del dominio. Devuelve cuántos avisos creó. */
  alertExposedUsers(input: {
    domain: string;
    level: ThreatLevel;
    runId: string;
    title: string;
    message: string;
  }): Promise<number>;
  /** Memoria: bitácora de ejecuciones. */
  saveRun(run: AgentRun): Promise<void>;
  listRuns(limit: number): Promise<AgentRun[]>;
}

/** Alertas del usuario autenticado (con RLS: solo ve las suyas). */
export interface AlertRepository {
  list(limit: number): Promise<AgentAlert[]>;
  markAllRead(): Promise<number>;
}
