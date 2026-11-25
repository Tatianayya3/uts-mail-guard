import { afterEach, describe, expect, test } from "bun:test";
import { AppError } from "@mail-guard/service-kit";
import { createServiceClient } from "../src/infrastructure/service-client";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

/** Servidor que responde con la secuencia dada y cuenta las llamadas. */
function serve(responses: Array<() => Response>) {
  const state = { calls: 0 };
  server = Bun.serve({
    port: 0,
    fetch() {
      const next = responses[Math.min(state.calls, responses.length - 1)]!;
      state.calls++;
      return next();
    },
  });
  const client = createServiceClient("history", server.url.href, "t", 2_000, {
    attempts: 3,
    delayMs: 1,
  });
  return { client, state };
}

const proxy502 = () =>
  new Response("<html>Bad Gateway</html>", { status: 502 });
const ok = () => Response.json({ items: [] });

describe("service-client · arranque en frío", () => {
  test("reintenta los 502 del proxy y devuelve la respuesta buena", async () => {
    const { client, state } = serve([proxy502, proxy502, ok]);
    expect(await client.request("/v1/scans")).toEqual({ items: [] });
    expect(state.calls).toBe(3);
  });

  test("tras agotar los intentos responde 503 con mensaje claro", async () => {
    const { client, state } = serve([proxy502]);
    const error = await client.request("/v1/scans").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(503);
    expect((error as AppError).message).toContain("se está iniciando");
    expect(state.calls).toBe(3);
  });

  test("reintenta el 429 del proxy de Render (sin JSON)", async () => {
    const { client, state } = serve([
      () => new Response("Too Many Requests", { status: 429 }),
      ok,
    ]);
    expect(await client.request("/v1/scans")).toEqual({ items: [] });
    expect(state.calls).toBe(2);
  });

  test("un 429 de la aplicación (con JSON) no se reintenta", async () => {
    const { client, state } = serve([
      () => Response.json({ error: "Límite diario." }, { status: 429 }),
    ]);
    const error = await client.request("/v1/scans").catch((e: unknown) => e);
    expect((error as AppError).status).toBe(429);
    expect((error as AppError).message).toBe("Límite diario.");
    expect(state.calls).toBe(1);
  });

  test("no reintenta los errores de la aplicación (con JSON)", async () => {
    const { client, state } = serve([
      () => Response.json({ error: "Falla real." }, { status: 500 }),
    ]);
    const error = await client.request("/v1/scans").catch((e: unknown) => e);
    expect((error as AppError).status).toBe(502);
    expect((error as AppError).message).toBe("Falla real.");
    expect(state.calls).toBe(1);
  });

  test("no reintenta los 4xx", async () => {
    const { client, state } = serve([
      () => Response.json({ error: "No encontrado." }, { status: 404 }),
    ]);
    const error = await client.request("/v1/scans/x").catch((e: unknown) => e);
    expect((error as AppError).status).toBe(404);
    expect(state.calls).toBe(1);
  });
});
