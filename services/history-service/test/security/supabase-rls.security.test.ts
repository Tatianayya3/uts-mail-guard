/**
 * RLS en la base real de Supabase. Usa solo la clave publicable (la misma que
 * tiene el navegador) y sin sesión: debe poder leer cero filas y no escribir.
 * Se omite si no hay SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY en el .env.
 */
import { describe, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@mail-guard/service-kit";
import { createSupabaseUserContext } from "../../src/infrastructure/supabase.repository";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(url && key);

const anon = configured
  ? createClient(url!, key!, { auth: { persistSession: false } })
  : null;

describe.skipIf(!configured)("RLS en Supabase (sin sesión)", () => {
  for (const table of ["mail_scans", "profiles", "profile_analytics"]) {
    test(`un visitante anónimo no obtiene filas de ${table}`, async () => {
      const { data, error } = await anon!.from(table).select("*").limit(5);
      // Seguro de dos formas: RLS filtra todo (0 filas) o el rol anon ni
      // siquiera tiene permiso sobre la tabla (42501).
      if (error) expect(error.code).toBe("42501");
      else expect(data).toEqual([]);
    });
  }

  test("un visitante anónimo no puede insertar análisis", async () => {
    const { error } = await anon!.from("mail_scans").insert({
      provider: "Gmail",
      subject: "intento sin sesión",
    });
    expect(error).not.toBeNull();
  });

  test("delete_my_history() sin sesión no borra nada", async () => {
    const { data, error } = await anon!.rpc("delete_my_history");
    expect(error !== null || data === 0).toBe(true);
  });

  test("history-service rechaza un JWT falsificado", async () => {
    const logger = createLogger("test");
    logger.warn = () => {};
    const users = createSupabaseUserContext(
      { url: url!, publishableKey: key! },
      logger,
    );
    expect(
      await users.fromToken("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.falsa"),
    ).toBeNull();
  });
});
