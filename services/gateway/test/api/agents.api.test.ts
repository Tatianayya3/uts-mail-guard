/**
 * Sistema multiagente de punta a punta, con los tres microservicios reales:
 * el Analista analiza → el Centinela detecta la campaña → el Analista usa ese
 * conocimiento en el siguiente correo del mismo dominio.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  agentsOverviewResponseSchema,
  sentinelRunResponseSchema,
  type EmailSnapshot,
  type ScanResponse,
} from "@mail-guard/contracts";
import { USERS, startSystem, type System } from "../support/system";

let system: System;
beforeAll(() => {
  system = startSystem();
});
afterAll(() => system.stop());

const ana = USERS.ana.token;
const luis = USERS.luis.token;

/** Correos de una campaña: mismo dominio, distinto contenido. */
const campaign = (n: number): EmailSnapshot => ({
  provider: "Gmail",
  sender: "pagos@pagos-express-co.com",
  senderName: "Pagos Express",
  subject: `URGENTE: pago pendiente ${n}`,
  bodyText: `Tu declaración tiene un saldo pendiente. Ingresa tu contraseña y número de tarjeta de inmediato. Caso ${n}.`,
  links: ["http://203.0.113.7/pago"],
});

/** Un correo del mismo dominio que, por sí solo, parece inofensivo. */
const quiet: EmailSnapshot = {
  provider: "Gmail",
  sender: "boletin@pagos-express-co.com",
  senderName: "Boletín",
  subject: "Boletín informativo",
  bodyText: "Te compartimos el boletín de este mes.",
  links: [],
};

const scan = async (email: EmailSnapshot, token: string) =>
  (await (
    await system.call("/v1/scans", { method: "POST", body: { email }, token })
  ).json()) as ScanResponse;

describe("Agentes · Analista + Centinela", () => {
  test("GET /v1/agents exige sesión", async () => {
    expect((await system.call("/v1/agents")).status).toBe(401);
  });

  test("antes de la campaña, el correo tranquilo se ve seguro", async () => {
    const res = await scan(quiet, luis);
    expect(res.scan.verdict).toBe("safe");
  });

  test("el Centinela detecta la campaña y avisa a los expuestos", async () => {
    await scan(campaign(1), ana);
    await scan(campaign(2), ana);
    await scan(campaign(3), luis);

    const res = await system.call("/v1/agents/sentinel/run", {
      method: "POST",
      token: ana,
    });
    expect(res.status).toBe(200);
    const { run } = sentinelRunResponseSchema.parse(await res.json());
    expect(run.trigger).toBe("manual");
    expect(run.status).toBe("completed");
    expect(run.decisions[0]).toMatchObject({
      domain: "pagos-express-co.com",
      decision: "flag",
      level: "dangerous",
    });
    expect(run.actions.map((a) => a.type)).toEqual([
      "add_threat",
      "alert_users",
    ]);
    expect(system.threats.get("pagos-express-co.com")?.active).toBe(true);
  });

  test("el panel ve amenazas y solo sus propias alertas", async () => {
    const res = await system.call("/v1/agents", { token: luis });
    const overview = agentsOverviewResponseSchema.parse(await res.json());
    expect(overview.sentinel.enabled).toBe(true);
    expect(overview.threats.map((t) => t.domain)).toContain(
      "pagos-express-co.com",
    );
    expect(overview.alerts).toHaveLength(1);
    expect(overview.alerts[0]!.domain).toBe("pagos-express-co.com");
  });

  test("el Analista usa lo que sabe el Centinela (aunque esté en caché)", async () => {
    const res = await scan(quiet, luis);
    expect(res.cached).toBe(true);
    expect(res.scan.verdict).toBe("dangerous");
    expect(res.scan.model).toContain("centinela");
    expect(res.scan.signals.find((s) => s.key === "sender")?.value).toBe(
      "Reportado por el agente Centinela",
    );
  });
});

describe("Agentes · permisos por rol", () => {
  test("un usuario normal no puede ejecutar al Centinela (403)", async () => {
    const res = await system.call("/v1/agents/sentinel/run", {
      method: "POST",
      token: luis,
    });
    expect(res.status).toBe(403);
  });

  test("un usuario normal ve sus alertas pero no la bitácora", async () => {
    const overview = agentsOverviewResponseSchema.parse(
      await (await system.call("/v1/agents", { token: luis })).json(),
    );
    expect(overview.runs).toEqual([]);
    expect(overview.sentinel.lastRun).toBeNull();
    expect(overview.threats.length).toBeGreaterThan(0);
  });

  test("un admin sí ve la bitácora", async () => {
    const overview = agentsOverviewResponseSchema.parse(
      await (await system.call("/v1/agents", { token: ana })).json(),
    );
    expect(overview.runs.length).toBeGreaterThan(0);
    expect(overview.sentinel.lastRun).not.toBeNull();
  });

  test("solo un admin puede listar usuarios", async () => {
    expect((await system.call("/v1/admin/users", { token: luis })).status).toBe(
      403,
    );
    // Sin clave secreta en el sistema de pruebas, el admin pasa el permiso y
    // recibe un error claro de configuración (5xx interno → 502 en el gateway).
    const res = await system.call("/v1/admin/users", { token: ana });
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toContain(
      "SUPABASE_SECRET_KEY",
    );
  });
});
