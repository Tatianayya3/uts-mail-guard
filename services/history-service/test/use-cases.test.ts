import { describe, expect, test } from "bun:test";
import type { Analytics, ScanRecord, StoredScan } from "@mail-guard/contracts";
import type {
  AuthenticatedUser,
  ScanRepository,
} from "../src/application/ports";
import {
  getOverview,
  listScans,
  syncScans,
} from "../src/application/use-cases";
import { createRoutes } from "../src/http/routes";
import { createLogger } from "@mail-guard/service-kit";

const user: AuthenticatedUser = {
  id: "user-1",
  email: "ana@uts.edu.co",
  fullName: "Ana",
  avatarUrl: null,
  createdAt: null,
};

function scan(
  hash: string | undefined,
  verdict: ScanRecord["verdict"] = "safe",
): StoredScan {
  return {
    provider: "Gmail",
    subject: "Hola",
    trustScore: verdict === "safe" ? 90 : 20,
    verdict,
    summary: "",
    advice: "",
    sender: {
      email: "a@b.com",
      domain: "b.com",
      domainStatus: "unknown",
      displayName: "A",
    },
    signals: [],
    links: [
      { url: "https://b.com", label: "b.com", status: "safe", detail: "" },
    ],
    model: "test",
    analyzedAt: new Date().toISOString(),
    emailHash: hash,
  };
}

function fakeRepo(
  initial: StoredScan[] = [],
  analytics: Analytics | null = null,
) {
  const rows: ScanRecord[] = initial.map((s, i) => ({
    ...s,
    id: String(i),
    createdAt: s.analyzedAt,
  }));
  const repo: ScanRepository & { rows: ScanRecord[] } = {
    rows,
    async insertMany(scans) {
      let saved = 0;
      for (const s of scans) {
        if (s.emailHash && rows.some((r) => r.emailHash === s.emailHash))
          continue;
        rows.unshift({
          ...s,
          id: String(rows.length),
          createdAt: s.analyzedAt,
        });
        saved += 1;
      }
      return saved;
    },
    listRecent: async (limit) => rows.slice(0, limit),
    getAnalytics: async () => analytics,
    getProfile: async () => null,
  };
  return repo;
}

describe("history use cases", () => {
  test("syncScans deduplica por huella", async () => {
    const repo = fakeRepo();
    const saved = await syncScans(repo, [
      scan("h1"),
      scan("h1"),
      scan("h2"),
      scan(undefined),
    ]);
    expect(saved).toBe(3);
  });

  test("listScans acota el límite", async () => {
    const repo = fakeRepo(Array.from({ length: 5 }, (_, i) => scan(`h${i}`)));
    expect(await listScans(repo, 1000)).toHaveLength(5);
    expect(await listScans(repo, 2)).toHaveLength(2);
  });

  test("getOverview deriva métricas si el agregado no existe", async () => {
    const repo = fakeRepo([scan("a"), scan("b", "dangerous")]);
    const overview = await getOverview(repo, user);
    expect(overview.analytics.totalScans).toBe(2);
    expect(overview.analytics.dangerousScans).toBe(1);
    expect(overview.analytics.linksReviewed).toBe(2);
    expect(overview.profile.displayName).toBe("Ana");
  });
});

describe("history routes", () => {
  const logger = createLogger("test");
  logger.info = () => {};

  test("rechaza llamadas sin token interno", async () => {
    const app = createRoutes({ logger, internalToken: "secret", users: null });
    const res = await app.request("/v1/me");
    expect(res.status).toBe(401);
  });

  test("responde 503 si Supabase no está configurado", async () => {
    const app = createRoutes({ logger, internalToken: "secret", users: null });
    const res = await app.request("/v1/me", {
      headers: { "x-internal-token": "secret" },
    });
    expect(res.status).toBe(503);
  });

  test("devuelve el resumen del usuario autenticado", async () => {
    const repo = fakeRepo([scan("a")]);
    const app = createRoutes({
      logger,
      internalToken: "secret",
      users: {
        fromToken: async (t) => (t === "jwt" ? { user, scans: repo } : null),
      },
    });
    const res = await app.request("/v1/me", {
      headers: { "x-internal-token": "secret", authorization: "Bearer jwt" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { analytics: Analytics };
    expect(body.analytics.totalScans).toBe(1);
  });
});
