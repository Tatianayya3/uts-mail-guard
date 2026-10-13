/**
 * Levanta los tres microservicios reales (gateway, analysis-service e
 * history-service) en puertos libres, comunicándose por HTTP como en
 * producción. Solo se reemplazan las dependencias externas:
 *
 * - Supabase → repositorio en memoria con un alcance por usuario (como RLS).
 * - Verificación del JWT → tokens fijos de prueba (`USERS`).
 * - Motor de IA → reglas locales (deterministas).
 */
import type {
  Analytics,
  EmailSnapshot,
  ScanRecord,
  StoredScan,
} from "@mail-guard/contracts";
import { createLogger, type Logger } from "@mail-guard/service-kit";
import { createAnalyzeEmail } from "../../../analysis-service/src/application/analyze-email";
import { createRoutes as createAnalysisRoutes } from "../../../analysis-service/src/http/routes";
import { createMemoryCache } from "../../../analysis-service/src/infrastructure/cache";
import { heuristicEngine } from "../../../analysis-service/src/infrastructure/engines/heuristic.engine";
import type {
  AuthenticatedUser,
  ScanRepository,
  UserContextFactory,
} from "../../../history-service/src/application/ports";
import { createRoutes as createHistoryRoutes } from "../../../history-service/src/http/routes";
import { createScanEmail } from "../../src/application/scan-email";
import { createRoutes as createGatewayRoutes } from "../../src/http/routes";
import { createMemoryQuota } from "../../src/infrastructure/quota";
import { createServiceClient } from "../../src/infrastructure/service-client";

export const INTERNAL_TOKEN = "token-interno-de-prueba";

/** Usuarios de prueba: token → usuario. */
export const USERS = {
  ana: { token: "jwt-de-ana", id: "11111111-1111-4111-8111-111111111111" },
  luis: { token: "jwt-de-luis", id: "22222222-2222-4222-8222-222222222222" },
} as const;

const silent: Logger = createLogger("test");
silent.info = () => {};
silent.warn = () => {};
silent.debug = () => {};

export const phishingEmail: EmailSnapshot = {
  provider: "Outlook",
  sender: "seguridad@bancolombla-alertas.com",
  senderName: "Bancolombia",
  subject: "URGENTE: tu cuenta será bloqueada",
  bodyText:
    "Tu cuenta será bloqueada en 24 horas. Verifica tu cuenta e ingresa tu contraseña y número de tarjeta aquí de inmediato.",
  links: ["http://192.168.10.20/login", "https://bit.ly/3xYz"],
};

export const legitEmail: EmailSnapshot = {
  provider: "Gmail",
  sender: "no-reply@accounts.google.com",
  senderName: "Google",
  subject: "Alerta de seguridad",
  bodyText:
    "Se inició sesión en tu cuenta desde un nuevo dispositivo. Si fuiste tú, no necesitas hacer nada.",
  links: ["https://myaccount.google.com/notifications"],
};

/** Un correo distinto en cada llamada (para no reutilizar la caché). */
export const uniqueEmail = (n: number): EmailSnapshot => ({
  ...legitEmail,
  subject: `Correo de prueba ${n}`,
  bodyText: `${legitEmail.bodyText} Referencia ${n}.`,
});

/** "Base de datos" en memoria: filas por usuario, como profile_id + RLS. */
function createMemoryStore() {
  const rows = new Map<string, ScanRecord[]>();
  const names = new Map<string, string>();
  let sequence = 0;

  const repoFor = (userId: string): ScanRepository => {
    const mine = () => rows.get(userId) ?? [];
    return {
      async insertMany(scans: StoredScan[]) {
        const list = mine();
        let saved = 0;
        for (const scan of scans) {
          if (
            scan.emailHash &&
            list.some((r) => r.emailHash === scan.emailHash)
          )
            continue;
          sequence += 1;
          list.unshift({
            ...scan,
            id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
            createdAt: new Date().toISOString(),
          });
          saved += 1;
        }
        rows.set(userId, list);
        return saved;
      },
      listRecent: async (limit) => mine().slice(0, limit),
      getAnalytics: async (): Promise<Analytics | null> => null,
      getProfile: async () =>
        names.has(userId)
          ? {
              id: userId,
              displayName: names.get(userId) ?? null,
              role: null,
              avatarUrl: null,
              createdAt: null,
            }
          : null,
      getById: async (id) => mine().find((r) => r.id === id) ?? null,
      async updateProfile({ displayName }) {
        names.set(userId, displayName);
      },
      async deleteAll() {
        const count = mine().length;
        rows.set(userId, []);
        return count;
      },
    };
  };

  const users: UserContextFactory = {
    async fromToken(token) {
      const match = Object.values(USERS).find((u) => u.token === token);
      if (!match) return null;
      const user: AuthenticatedUser = {
        id: match.id,
        email: null,
        fullName: null,
        avatarUrl: null,
        createdAt: null,
      };
      return { user, scans: repoFor(match.id) };
    },
  };

  return { users, rows };
}

export type System = Awaited<ReturnType<typeof startSystem>>;

export function startSystem(
  options: { anonymousLimit?: number; withHistory?: boolean } = {},
) {
  const store = createMemoryStore();

  const analysisApp = createAnalysisRoutes({
    logger: silent,
    internalToken: INTERNAL_TOKEN,
    engineName: heuristicEngine.name,
    analyzeEmail: createAnalyzeEmail({
      engine: heuristicEngine,
      cache: createMemoryCache(60),
      logger: silent,
    }),
  });
  const historyApp = createHistoryRoutes({
    logger: silent,
    internalToken: INTERNAL_TOKEN,
    users: options.withHistory === false ? null : store.users,
  });

  const analysisServer = Bun.serve({ port: 0, fetch: analysisApp.fetch });
  const historyServer = Bun.serve({ port: 0, fetch: historyApp.fetch });

  const analysis = createServiceClient(
    "analysis",
    analysisServer.url.href,
    INTERNAL_TOKEN,
  );
  const history = createServiceClient(
    "history",
    historyServer.url.href,
    INTERNAL_TOKEN,
  );
  const quota = createMemoryQuota({
    anonymous: options.anonymousLimit ?? 5,
    authenticated: 100,
  });
  const gatewayApp = createGatewayRoutes({
    logger: silent,
    corsOrigins: ["*"],
    identity: {
      verify: async (token) => {
        const match = Object.values(USERS).find((u) => u.token === token);
        return match ? { userId: match.id, token } : null;
      },
    },
    analysis,
    history,
    scanEmail: createScanEmail({ analysis, history, quota, logger: silent }),
  });
  const gatewayServer = Bun.serve({ port: 0, fetch: gatewayApp.fetch });

  const gatewayUrl = gatewayServer.url.href.replace(/\/$/, "");

  /** Petición al gateway, como lo haría la extensión o el panel. */
  const call = (
    path: string,
    init: {
      method?: string;
      body?: unknown;
      token?: string;
      headers?: Record<string, string>;
    } = {},
  ) =>
    fetch(`${gatewayUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
      body:
        init.body === undefined
          ? undefined
          : typeof init.body === "string"
            ? init.body
            : JSON.stringify(init.body),
    });

  return {
    gatewayUrl,
    analysisUrl: analysisServer.url.href.replace(/\/$/, ""),
    historyUrl: historyServer.url.href.replace(/\/$/, ""),
    rows: store.rows,
    call,
    stop() {
      gatewayServer.stop(true);
      analysisServer.stop(true);
      historyServer.stop(true);
    },
  };
}
