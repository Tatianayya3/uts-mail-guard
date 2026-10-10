import { describe, expect, test } from "bun:test";
import type { Analytics, ScanRecord, StoredScan } from "@mail-guard/contracts";
import type {
  AuthenticatedUser,
  ScanRepository,
} from "../src/application/ports";
import {
  deleteHistory,
  getOverview,
  getScan,
  listScans,
  syncScans,
  updateProfile,
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

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function fakeRepo(
  initial: StoredScan[] = [],
  analytics: Analytics | null = null,
) {
  const rows: ScanRecord[] = initial.map((s, i) => ({
    ...s,
    id: uuid(i),
    createdAt: s.analyzedAt,
  }));
  let displayName: string | null = null;
  const repo: ScanRepository & { rows: ScanRecord[] } = {
    rows,
    async insertMany(scans) {
      let saved = 0;
      for (const s of scans) {
        if (s.emailHash && rows.some((r) => r.emailHash === s.emailHash))
          continue;
        rows.unshift({
          ...s,
          id: uuid(rows.length + 100),
          createdAt: s.analyzedAt,
        });
        saved += 1;
      }
      return saved;
    },
    listRecent: async (limit) => rows.slice(0, limit),
    getAnalytics: async () => analytics,
    getProfile: async () =>
      displayName
        ? {
            id: user.id,
            displayName,
            role: null,
            avatarUrl: null,
            createdAt: null,
          }
        : null,
    getById: async (id) => rows.find((r) => r.id === id) ?? null,
    updateProfile: async (changes) => {
      displayName = changes.displayName;
    },
    deleteAll: async () => rows.splice(0).length,
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

describe("detalle, perfil y borrado", () => {
  test("getScan devuelve el análisis propio y 404 si no existe o el id no es válido", async () => {
    const repo = fakeRepo([scan("a")]);
    expect((await getScan(repo, uuid(0))).emailHash).toBe("a");
    await expect(getScan(repo, uuid(9))).rejects.toThrow("No encontramos");
    await expect(getScan(repo, "'; drop table")).rejects.toThrow(
      "No encontramos",
    );
  });

  test("updateProfile cambia el nombre y devuelve el resumen", async () => {
    const overview = await updateProfile(fakeRepo(), user, {
      displayName: "Ana María",
    });
    expect(overview.profile.displayName).toBe("Ana María");
  });

  test("deleteHistory borra todo y lo informa", async () => {
    const repo = fakeRepo([scan("a"), scan("b")]);
    expect(await deleteHistory(repo)).toBe(2);
    expect(repo.rows).toHaveLength(0);
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

  test("PATCH /v1/me valida el nombre", async () => {
    const app = createRoutes({
      logger,
      internalToken: "secret",
      users: { fromToken: async () => ({ user, scans: fakeRepo() }) },
    });
    const headers = {
      "x-internal-token": "secret",
      authorization: "Bearer jwt",
      "Content-Type": "application/json",
    };
    const bad = await app.request("/v1/me", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ displayName: "A" }),
    });
    expect(bad.status).toBe(400);
    const ok = await app.request("/v1/me", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ displayName: "Ana" }),
    });
    expect(ok.status).toBe(200);
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
