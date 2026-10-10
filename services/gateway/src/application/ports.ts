import type { Quota } from "@mail-guard/contracts";

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

/** Cliente hacia los microservicios internos. */
export interface ServiceClient {
  request<T>(
    path: string,
    init?: {
      method?: "GET" | "POST";
      body?: unknown;
      token?: string;
      requestId?: string;
    },
  ): Promise<T>;
}
