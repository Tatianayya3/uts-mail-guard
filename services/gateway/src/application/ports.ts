import type { Quota, ThreatIntel, Verdict } from "@mail-guard/contracts";

export type Identity = { userId: string; token: string };

/** Verifica el JWT de Supabase. null = anónimo o token inválido. */
export interface IdentityVerifier {
  verify(token: string): Promise<Identity | null>;
}

/** Cuota diaria de análisis por usuario o por IP. */
export interface QuotaPolicy {
  peek(key: string, authenticated: boolean): Promise<Quota>;
  consume(key: string, authenticated: boolean): Promise<Quota>;
}

/** Registra cada análisis entregado (métricas de negocio para el monitoreo). */
export interface ScanMetrics {
  recorded(verdict: Verdict, cached: boolean): void;
}

/** Base de conocimiento del agente Centinela, para entregársela al Analista. */
export interface ThreatFeed {
  get(): Promise<ThreatIntel[]>;
  /** Fuerza a refrescarla en el próximo análisis (p. ej. tras un ciclo manual). */
  invalidate(): void;
}

/** Cliente hacia los microservicios internos. */
export interface ServiceClient {
  request<T>(
    path: string,
    init?: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: unknown;
      token?: string;
      requestId?: string;
    },
  ): Promise<T>;
}
