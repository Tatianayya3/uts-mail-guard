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
import type {
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

type Env = { Variables: { user: AuthenticatedUser; scans: ScanRepository } };

export function createRoutes(deps: {
  logger: Logger;
  internalToken: string;
  users: UserContextFactory | null;
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
    return c.json({ saved: await saveScan(c.var.scans, scan) });
  });

  v1.post("/scans/sync", authenticate, async (c) => {
    const { scans } = await readJson(
      c,
      syncScansRequestSchema,
      "Los análisis no son válidos.",
    );
    return c.json({ saved: await syncScans(c.var.scans, scans) });
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

  return app;
}
