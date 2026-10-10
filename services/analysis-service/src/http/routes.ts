import { scanRequestSchema } from "@mail-guard/contracts";
import {
  createServiceApp,
  readJson,
  requireInternalToken,
  type Logger,
} from "@mail-guard/service-kit";
import type { createAnalyzeEmail } from "../application/analyze-email";

type Deps = {
  logger: Logger;
  internalToken: string;
  engineName: string;
  analyzeEmail: ReturnType<typeof createAnalyzeEmail>;
};

/** Adaptador HTTP: traduce peticiones a casos de uso, sin lógica de negocio. */
export function createRoutes({
  logger,
  internalToken,
  engineName,
  analyzeEmail,
}: Deps) {
  const app = createServiceApp("analysis-service", logger);

  app.get("/v1/engine", (c) => c.json({ engine: engineName }));

  app.post("/v1/analyze", requireInternalToken(internalToken), async (c) => {
    const { email } = await readJson(
      c,
      scanRequestSchema,
      "La información del correo no es válida.",
    );
    return c.json(await analyzeEmail(email));
  });

  return app;
}
