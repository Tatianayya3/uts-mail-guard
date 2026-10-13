/**
 * Pruebas de aceptación: ejecuta los escenarios de `features/*.feature`
 * contra los tres microservicios reales (ver test/support/system.ts).
 */
import { expect } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  EmailSnapshot,
  ScanResponse,
  Verdict,
} from "@mail-guard/contracts";
import {
  USERS,
  legitEmail,
  phishingEmail,
  startSystem,
  uniqueEmail,
  type System,
} from "../support/system";
import { runFeature, type StepDefinition } from "./gherkin";

type World = {
  system: System;
  token?: string;
  ip: string;
  status?: number;
  body?: unknown;
};

const EMAILS: Record<string, EmailSnapshot> = {
  "phishing del banco": phishingEmail,
  "alerta legítima de Google": legitEmail,
};

const VERDICTS: Record<string, Verdict> = {
  peligroso: "dangerous",
  sospechoso: "suspicious",
  seguro: "safe",
};

async function request(
  world: World,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const res = await world.system.call(path, {
    ...init,
    token: world.token,
    headers: { "x-forwarded-for": world.ip },
  });
  world.status = res.status;
  world.body = await res.json();
  return world.body;
}

const scan = (world: World) => world.body as ScanResponse;
const history = async (world: World) =>
  (
    (await request(world, "/v1/scans")) as {
      scans: { id: string; verdict: string }[];
    }
  ).scans;

const steps: StepDefinition<World>[] = [
  [/^un invitado con la extensión instalada$/, () => {}],
  [
    /^un invitado que ya hizo (\d+) análisis hoy$/,
    async (world, count) => {
      for (let n = 0; n < Number(count); n++)
        await request(world, "/v1/scans", {
          method: "POST",
          body: { email: uniqueEmail(n) },
        });
      expect(world.status).toBe(200);
    },
  ],
  [
    /^que Ana inició sesión$/,
    (world) => {
      world.token = USERS.ana.token;
    },
  ],
  [
    /^(?:que )?(?:analiza|analizó) el correo "(.+)"$/,
    async (world, name) => {
      const email = EMAILS[name];
      if (!email) throw new Error(`correo de ejemplo desconocido: ${name}`);
      await request(world, "/v1/scans", { method: "POST", body: { email } });
    },
  ],
  [
    /^el veredicto es "(.+)"$/,
    (world, verdict) => {
      expect(scan(world).scan.verdict).toBe(VERDICTS[verdict]!);
    },
  ],
  [
    /^el puntaje de confianza es menor que (\d+)$/,
    (world, limit) => {
      expect(scan(world).scan.trustScore).toBeLessThan(Number(limit));
    },
  ],
  [
    /^el puntaje de confianza es mayor o igual que (\d+)$/,
    (world, limit) => {
      expect(scan(world).scan.trustScore).toBeGreaterThanOrEqual(Number(limit));
    },
  ],
  [
    /^el resultado no se guarda en ningún historial$/,
    (world) => {
      expect(scan(world).saved).toBe(false);
      expect(world.system.rows.size).toBe(0);
    },
  ],
  [
    /^recibe el error (\d+)$/,
    (world, status) => {
      expect(world.status).toBe(Number(status));
    },
  ],
  [
    /^el mensaje invita a iniciar sesión$/,
    (world) => {
      expect((world.body as { error: string }).error).toContain(
        "Inicia sesión",
      );
    },
  ],
  [
    /^su historial tiene (\d+) análisis$/,
    async (world, count) => {
      expect(await history(world)).toHaveLength(Number(count));
    },
  ],
  [
    /^el último análisis es "(.+)"$/,
    async (world, verdict) => {
      expect((await history(world))[0]?.verdict).toBe(VERDICTS[verdict]!);
    },
  ],
  [
    /^abre el detalle del último análisis$/,
    async (world) => {
      const [latest] = await history(world);
      await request(world, `/v1/scans/${latest!.id}`);
      expect(world.status).toBe(200);
    },
  ],
  [
    /^ve el remitente "(.+)"$/,
    (world, sender) => {
      expect(
        (world.body as { scan: { sender: { email: string } } }).scan.sender
          .email,
      ).toBe(sender);
    },
  ],
  [
    /^borra su historial$/,
    async (world) => {
      await request(world, "/v1/scans", { method: "DELETE" });
    },
  ],
  [
    /^se borraron (\d+) análisis$/,
    (world, count) => {
      expect((world.body as { deleted: number }).deleted).toBe(Number(count));
    },
  ],
  [
    /^intenta ver el historial$/,
    async (world) => {
      await request(world, "/v1/scans");
    },
  ],
];

const dir = join(import.meta.dir, "features");
for (const file of readdirSync(dir)
  .filter((f) => f.endsWith(".feature"))
  .sort()) {
  runFeature(join(dir, file), steps, {
    create: () => ({
      system: startSystem({ anonymousLimit: 5 }),
      ip: "10.9.0.1",
    }),
    dispose: (world) => world.system.stop(),
  });
}
