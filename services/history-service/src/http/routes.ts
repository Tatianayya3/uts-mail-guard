import type { MiddlewareHandler } from "hono";
import {
  saveScanRequestSchema,
  syncScansRequestSchema,
  updateProfileRequestSchema,
} from "@mail-guard/contracts";
import {
  bearerToken,
  createServiceApp,
  readJson,
  requireInternalToken,
  unauthorized,
  unavailable,
  type Logger,
} from "@mail-guard/service-kit";
import type { Role, Verdict } from "@mail-guard/contracts";
import type { AlertRepository } from "../agents/sentinel/ports";
import { registerAdminRoutes } from "./admin.routes";
import { registerAgentRoutes, type AgentDeps } from "./agents.routes";
import type {
  AdminRepository,
  AuthenticatedUser,
  ScanRepository,
  UserContextFactory,
} from "../application/ports";
import {
  deleteHistory,
  getOverview,
  getScan,
  listScans,
  saveScan,
  syncScans,
  updateProfile,
} from "../application/use-cases";

export type HistoryEnv = {
  Variables: {
    user: AuthenticatedUser;
    scans: ScanRepository;
    alerts?: AlertRepository;
    role?: Role;
  };
};
type Env = HistoryEnv;

export function createRoutes(deps: {
  logger: Logger;
  internalToken: string;
  users: UserContextFactory | null;
  /** Agentes (opcional): sin ellos /v1/agents responde vacío o 503. */
  agents?: AgentDeps;
  /** Administración de usuarios (opcional: requiere la clave secreta). */
  admin?: AdminRepository | null;
  /** Se llama tras guardar análisis (dispara al Centinela por eventos). */
  onScansSaved?: (verdicts: Verdict[]) => void;
}) {
  const app = createServiceApp("history-service", deps.logger);

  const authenticate: MiddlewareHandler<Env> = async (c, next) => {
    if (!deps.users)
      throw unavailable("El historial no está configurado (Supabase).");
    const token = bearerToken(c);
    const context = token ? await deps.users.fromToken(token) : null;
    if (!context) throw unauthorized();
    c.set("user", context.user);
    c.set("scans", context.scans);
    if (context.alerts) c.set("alerts", context.alerts);
    await next();
  };

  const v1 = app.basePath("/v1");
  v1.use("*", requireInternalToken(deps.internalToken));

  v1.post("/scans", authenticate, async (c) => {
    const { scan } = await readJson(
      c,
      saveScanRequestSchema,
      "El análisis no es válido.",
    );
    const saved = await saveScan(c.var.scans, scan);
    deps.onScansSaved?.([scan.verdict]);
    return c.json({ saved });
  });

  v1.post("/scans/sync", authenticate, async (c) => {
    const { scans } = await readJson(
      c,
      syncScansRequestSchema,
      "Los análisis no son válidos.",
    );
    const saved = await syncScans(c.var.scans, scans);
    if (saved > 0) deps.onScansSaved?.(scans.map((s) => s.verdict));
    return c.json({ saved });
  });

  v1.get("/scans", authenticate, async (c) => {
    const limit = Number(c.req.query("limit") ?? 20);
    return c.json({ scans: await listScans(c.var.scans, limit) });
  });

  v1.get("/scans/:id", authenticate, async (c) =>
    c.json({ scan: await getScan(c.var.scans, c.req.param("id")) }),
  );

  v1.delete("/scans", authenticate, async (c) =>
    c.json({ deleted: await deleteHistory(c.var.scans) }),
  );

  v1.patch("/me", authenticate, async (c) => {
    const changes = await readJson(
      c,
      updateProfileRequestSchema,
      "El nombre no es válido.",
    );
    return c.json(await updateProfile(c.var.scans, c.var.user, changes));
  });

  v1.get("/me", authenticate, async (c) =>
    c.json(await getOverview(c.var.scans, c.var.user)),
  );

  registerAdminRoutes(v1, authenticate, deps.admin ?? null);
  registerAgentRoutes(v1, authenticate, {
    sentinel: deps.agents?.sentinel ?? null,
    repo: deps.agents?.repo ?? null,
    intervalMinutes: deps.agents?.intervalMinutes ?? 30,
  });

  return app;
}
