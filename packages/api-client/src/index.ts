import type { z } from "zod";
import {
  adminUsersResponseSchema,
  agentsOverviewResponseSchema,
  deleteHistoryResponseSchema,
  markAlertsReadResponseSchema,
  sentinelRunResponseSchema,
  updateUserRoleResponseSchema,
  overviewResponseSchema,
  scanDetailResponseSchema,
  scanListResponseSchema,
  scanResponseSchema,
  syncScansResponseSchema,
  type AdminUser,
  type AgentRun,
  type AgentsOverview,
  type EmailSnapshot,
  type Overview,
  type ScanRecord,
  type Role,
  type ScanResponse,
  type StoredScan,
  type UpdateProfileValues,
} from "@mail-guard/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type MailGuardApiOptions = {
  /** URL pública del API Gateway, p. ej. http://localhost:4000 */
  baseUrl: string;
  /** Devuelve el JWT de Supabase del usuario, o null si es anónimo. */
  getAccessToken?: () => Promise<string | null | undefined>;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

const NETWORK_ERROR = "No pudimos conectar con Mail Guard. Revisa tu conexión.";

/**
 * Cliente único para hablar con el API Gateway. Valida cada respuesta con los
 * contratos compartidos, así un cambio de forma en el backend falla aquí y no
 * en la interfaz.
 */
export function createMailGuardApi(options: MailGuardApiOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;

  async function request<S extends z.ZodType>(
    path: string,
    schema: S,
    init: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: unknown;
      auth?: "optional" | "required";
    } = {},
  ): Promise<z.infer<S>> {
    const token = await options.getAccessToken?.();
    if (init.auth === "required" && !token) {
      throw new ApiError("Inicia sesión para continuar.", 401);
    }

    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers: {
          ...(init.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ApiError(NETWORK_ERROR, 0);
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : "Ocurrió un error inesperado.";
      throw new ApiError(message, response.status);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError("La respuesta del servidor no es válida.", 502);
    }
    return parsed.data;
  }

  return {
    /** UC-01: analiza un correo. Si hay sesión, el gateway también lo guarda. */
    scanEmail(email: EmailSnapshot): Promise<ScanResponse> {
      return request("/v1/scans", scanResponseSchema, {
        method: "POST",
        body: { email },
        auth: "optional",
      });
    },
    /** UC-08: sube los análisis hechos sin sesión. */
    async syncScans(scans: StoredScan[]): Promise<number> {
      if (scans.length === 0) return 0;
      const { saved } = await request(
        "/v1/scans/sync",
        syncScansResponseSchema,
        {
          method: "POST",
          body: { scans },
          auth: "required",
        },
      );
      return saved;
    },
    /** UC-09: historial reciente del usuario. */
    async listScans(limit = 20): Promise<ScanRecord[]> {
      const { scans } = await request(
        `/v1/scans?limit=${encodeURIComponent(limit)}`,
        scanListResponseSchema,
        { auth: "required" },
      );
      return scans;
    },
    /** UC-10: detalle de un análisis propio. */
    async getScan(id: string): Promise<ScanRecord> {
      const { scan } = await request(
        `/v1/scans/${encodeURIComponent(id)}`,
        scanDetailResponseSchema,
        {
          auth: "required",
        },
      );
      return scan;
    },
    /** UC-12: editar el nombre visible. Devuelve el resumen actualizado. */
    updateProfile(changes: UpdateProfileValues): Promise<Overview> {
      return request("/v1/me", overviewResponseSchema, {
        method: "PATCH",
        body: changes,
        auth: "required",
      });
    },
    /** UC-13: borrar todo el historial. Devuelve cuántos análisis se borraron. */
    async deleteHistory(): Promise<number> {
      const { deleted } = await request(
        "/v1/scans",
        deleteHistoryResponseSchema,
        {
          method: "DELETE",
          auth: "required",
        },
      );
      return deleted;
    },
    /** UC-09: perfil + métricas agregadas. */
    getOverview(): Promise<Overview> {
      return request("/v1/me", overviewResponseSchema, { auth: "required" });
    },
    /** Admin: todas las personas registradas con su rol. */
    async listUsers(): Promise<AdminUser[]> {
      const { users } = await request(
        "/v1/admin/users",
        adminUsersResponseSchema,
        { auth: "required" },
      );
      return users;
    },
    /** Admin: cambia el rol de una persona (user ↔ admin). */
    async setUserRole(id: string, role: Role): Promise<AdminUser> {
      const { user } = await request(
        `/v1/admin/users/${encodeURIComponent(id)}`,
        updateUserRoleResponseSchema,
        { method: "PATCH", body: { role }, auth: "required" },
      );
      return user;
    },
    /** Agentes: estado del Centinela, amenazas, alertas propias y bitácora. */
    getAgents(): Promise<AgentsOverview> {
      return request("/v1/agents", agentsOverviewResponseSchema, {
        auth: "required",
      });
    },
    /** Agentes: ejecución semiautomática de un ciclo del Centinela. */
    async runSentinel(): Promise<AgentRun> {
      const { run } = await request(
        "/v1/agents/sentinel/run",
        sentinelRunResponseSchema,
        { method: "POST", auth: "required" },
      );
      return run;
    },
    /** Agentes: marca como leídas las alertas del usuario. */
    async markAlertsRead(): Promise<number> {
      const { updated } = await request(
        "/v1/agents/alerts/read",
        markAlertsReadResponseSchema,
        { method: "POST", auth: "required" },
      );
      return updated;
    },
  };
}

export type MailGuardApi = ReturnType<typeof createMailGuardApi>;
