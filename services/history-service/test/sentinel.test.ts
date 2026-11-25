import { describe, expect, test } from "bun:test";
import type { AgentRun, ThreatDomain } from "@mail-guard/contracts";
import { agentRunSchema } from "@mail-guard/contracts";
import { createLogger } from "@mail-guard/service-kit";
import {
  actionable,
  deliberate,
  DEFAULT_POLICY,
  priorityOf,
  type Observation,
} from "../src/agents/sentinel/policy";
import type { SentinelRepository } from "../src/agents/sentinel/ports";
import { createSentinel } from "../src/agents/sentinel/sentinel";

const NOW = new Date("2026-11-25T12:00:00.000Z");
const silent = createLogger("test");
silent.info = () => {};
silent.warn = () => {};
silent.error = () => {};

const obs = (
  domain: string,
  dangerous: number,
  suspicious = 0,
  safe = 0,
  users = 1,
): Observation => ({
  domain,
  dangerousReports: dangerous,
  suspiciousReports: suspicious,
  safeReports: safe,
  affectedUsers: users,
  lastSeenAt: NOW.toISOString(),
});

const threat = (
  domain: string,
  level: ThreatDomain["level"],
  extra: Partial<ThreatDomain> = {},
): ThreatDomain => ({
  domain,
  level,
  dangerousReports: 2,
  suspiciousReports: 0,
  affectedUsers: 1,
  priority: 8,
  reason: "",
  active: true,
  firstSeenAt: "2026-11-01T00:00:00.000Z",
  lastSeenAt: "2026-11-20T00:00:00.000Z",
  ...extra,
});

describe("Centinela · deliberación", () => {
  test("detecta una campaña peligrosa nueva (flag)", () => {
    const [d] = deliberate(
      [obs("bancolombla-seguridad.com", 3, 0, 0, 2)],
      [],
      NOW,
    );
    expect(d).toMatchObject({
      domain: "bancolombla-seguridad.com",
      decision: "flag",
      level: "dangerous",
    });
    expect(d!.reason).toContain("3 reportes peligrosos");
  });

  test("un solo reporte no alcanza el umbral", () => {
    expect(deliberate([obs("x.com", 1)], [], NOW)).toEqual([]);
  });

  test("varios sospechosos lo marcan como sospechoso", () => {
    const [d] = deliberate([obs("promo-dian.co", 0, 3)], [], NOW);
    expect(d).toMatchObject({ decision: "flag", level: "suspicious" });
  });

  test("escala de sospechoso a peligroso", () => {
    const [d] = deliberate(
      [obs("promo-dian.co", 2, 2)],
      [threat("promo-dian.co", "suspicious")],
      NOW,
    );
    expect(d).toMatchObject({ decision: "escalate", level: "dangerous" });
  });

  test("refresca conteos de una amenaza conocida", () => {
    const [d] = deliberate(
      [obs("x.com", 4)],
      [threat("x.com", "dangerous")],
      NOW,
    );
    expect(d!.decision).toBe("refresh");
  });

  test("no hace nada si la amenaza conocida no cambió", () => {
    expect(
      deliberate([obs("x.com", 2)], [threat("x.com", "dangerous")], NOW),
    ).toEqual([]);
  });

  test("nunca bloquea proveedores masivos como gmail.com", () => {
    const [d] = deliberate([obs("gmail.com", 10, 0, 0, 5)], [], NOW);
    expect(d!.decision).toBe("ignore");
    expect(actionable([d!])).toEqual([]);
  });

  test("descarta dominios con reputación mixta", () => {
    const [d] = deliberate([obs("tienda.com", 2, 0, 5)], [], NOW);
    expect(d!.decision).toBe("ignore");
    expect(d!.reason).toContain("Reputación mixta");
  });

  test("retira amenazas sin reportes en la ventana", () => {
    const old = threat("viejo.com", "dangerous", {
      lastSeenAt: "2026-10-01T00:00:00.000Z",
    });
    const [d] = deliberate([], [old], NOW);
    expect(d).toMatchObject({ domain: "viejo.com", decision: "retire" });
  });

  test("ordena por prioridad (utilidad) y respeta el máximo por ciclo", () => {
    const decisions = deliberate(
      [obs("poco.com", 2), obs("mucho.com", 8, 0, 0, 6)],
      [],
      NOW,
    );
    expect(decisions.map((d) => d.domain)).toEqual(["mucho.com", "poco.com"]);
    expect(priorityOf(obs("mucho.com", 8, 0, 0, 6))).toBe(36);
    expect(
      actionable(decisions, { ...DEFAULT_POLICY, maxActionsPerRun: 1 }),
    ).toHaveLength(1);
  });
});

function memoryRepo(observations: Observation[], known: ThreatDomain[] = []) {
  const threats = new Map(known.map((t) => [t.domain, t]));
  const runs: AgentRun[] = [];
  const alerts: Array<{ domain: string; level: string }> = [];
  const repo: SentinelRepository = {
    observe: async () => observations,
    listThreats: async ({ activeOnly } = {}) =>
      [...threats.values()].filter((t) => !activeOnly || t.active),
    upsertThreat: async (t) => void threats.set(t.domain, t),
    retireThreat: async (d) =>
      void threats.set(d, { ...threats.get(d)!, active: false }),
    alertExposedUsers: async ({ domain, level }) => {
      alerts.push({ domain, level });
      return 2;
    },
    saveRun: async (run) => void runs.push(run),
    listRuns: async () => runs,
  };
  return { repo, threats, runs, alerts };
}

describe("Centinela · ciclo percibir → deliberar → actuar", () => {
  test("publica la amenaza, avisa y deja la bitácora", async () => {
    const mem = memoryRepo([obs("bancolombla-seguridad.com", 3, 0, 0, 2)]);
    const sentinel = createSentinel({
      repo: mem.repo,
      logger: silent,
      now: () => NOW,
      newId: () => "run-1",
    });
    const run = await sentinel.run("automatic");

    expect(agentRunSchema.safeParse(run).success).toBe(true);
    expect(run.status).toBe("completed");
    expect(run.perceived).toMatchObject({
      domainsObserved: 1,
      scansObserved: 3,
    });
    expect(run.actions.map((a) => a.type)).toEqual([
      "add_threat",
      "alert_users",
    ]);
    expect(mem.threats.get("bancolombla-seguridad.com")?.level).toBe(
      "dangerous",
    );
    expect(mem.alerts).toEqual([
      { domain: "bancolombla-seguridad.com", level: "dangerous" },
    ]);
    expect(mem.runs).toHaveLength(1);
    expect(run.summary).toContain("Publicó 1");
  });

  test("refrescar no vuelve a avisar", async () => {
    const mem = memoryRepo([obs("x.com", 5)], [threat("x.com", "dangerous")]);
    const run = await createSentinel({ repo: mem.repo, logger: silent }).run(
      "event",
    );
    expect(run.actions.map((a) => a.type)).toEqual(["update_threat"]);
    expect(mem.alerts).toEqual([]);
  });

  test("sin campañas, no actúa", async () => {
    const run = await createSentinel({
      repo: memoryRepo([obs("ok.com", 0, 0, 4)]).repo,
      logger: silent,
    }).run("automatic");
    expect(run.actions).toEqual([]);
    expect(run.summary).toContain("no hizo falta actuar");
  });

  test("un error del sensor queda registrado como ciclo fallido", async () => {
    const mem = memoryRepo([]);
    mem.repo.observe = async () => {
      throw new Error("sin conexión");
    };
    const run = await createSentinel({ repo: mem.repo, logger: silent }).run(
      "automatic",
    );
    expect(run.status).toBe("failed");
    expect(run.summary).toContain("sin conexión");
  });

  test("no corre dos ciclos a la vez y limita el manual repetido", async () => {
    const mem = memoryRepo([obs("x.com", 3)]);
    let calls = 0;
    const observe = mem.repo.observe;
    mem.repo.observe = async (since) => {
      calls++;
      return observe(since);
    };
    const sentinel = createSentinel({ repo: mem.repo, logger: silent });
    const [a, b] = await Promise.all([
      sentinel.run("automatic"),
      sentinel.run("manual"),
    ]);
    expect(a.id).toBe(b.id);
    const c = await sentinel.run("manual");
    expect(c.id).toBe(a.id);
    expect(calls).toBe(1);
  });
});
