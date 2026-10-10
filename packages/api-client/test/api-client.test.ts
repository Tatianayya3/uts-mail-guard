import { describe, expect, test } from "bun:test";
import { ApiError, createMailGuardApi } from "../src";

const email = {
  provider: "Gmail" as const,
  sender: "a@b.com",
  subject: "",
  bodyText: "",
  links: [],
};

function fakeFetch(
  status: number,
  body: unknown,
  seen: { headers?: Headers; url?: string } = {},
) {
  return (async (url: string, init?: RequestInit) => {
    seen.url = url;
    seen.headers = new Headers(init?.headers);
    return Response.json(body, { status });
  }) as unknown as typeof fetch;
}

describe("createMailGuardApi", () => {
  test("envía el JWT cuando hay sesión y normaliza la URL base", async () => {
    const seen: { headers?: Headers; url?: string } = {};
    const api = createMailGuardApi({
      baseUrl: "http://gw/",
      getAccessToken: async () => "jwt",
      fetch: fakeFetch(
        200,
        {
          profile: {
            id: "1",
            displayName: null,
            role: null,
            avatarUrl: null,
            createdAt: null,
          },
          analytics: {
            totalScans: 0,
            safeScans: 0,
            suspiciousScans: 0,
            dangerousScans: 0,
            unknownScans: 0,
            linksReviewed: 0,
            averageTrustScore: 0,
            lastScannedAt: null,
          },
        },
        seen,
      ),
    });
    await api.getOverview();
    expect(seen.url).toBe("http://gw/v1/me");
    expect(seen.headers?.get("authorization")).toBe("Bearer jwt");
  });

  test("propaga el mensaje de error del gateway", async () => {
    const api = createMailGuardApi({
      baseUrl: "http://gw",
      fetch: fakeFetch(429, { error: "Límite alcanzado" }),
    });
    const error = await api.scanEmail(email).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect((error as ApiError).message).toBe("Límite alcanzado");
  });

  test("rechaza respuestas que no cumplen el contrato", async () => {
    const api = createMailGuardApi({
      baseUrl: "http://gw",
      fetch: fakeFetch(200, { nope: true }),
    });
    await expect(api.scanEmail(email)).rejects.toThrow("no es válida");
  });

  test("las rutas privadas exigen sesión sin llamar a la red", async () => {
    let called = false;
    const api = createMailGuardApi({
      baseUrl: "http://gw",
      getAccessToken: async () => null,
      fetch: (async () => {
        called = true;
        return Response.json({});
      }) as unknown as typeof fetch,
    });
    await expect(api.listScans()).rejects.toThrow("Inicia sesión");
    expect(called).toBe(false);
  });
});
