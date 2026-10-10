"use server";

import { refresh } from "next/cache";
import { firstIssue, updateProfileRequestSchema } from "@mail-guard/contracts";
import { apiFor } from "@/lib/api.server";
import { getServerSession } from "@/lib/supabase/server";

export type ActionResult =
  { ok: true; message: string } | { ok: false; message: string };

const failure = (reason: unknown, fallback: string): ActionResult => ({
  ok: false,
  message: reason instanceof Error ? reason.message : fallback,
});

/**
 * Server Actions: se ejecutan en el servidor con el JWT de la cookie, así el
 * token nunca viaja a JavaScript del navegador para estas operaciones.
 */
export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session)
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  const parsed = updateProfileRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  try {
    await apiFor(session.accessToken).updateProfile(parsed.data);
    refresh();
    return { ok: true, message: "Guardamos tu nombre." };
  } catch (reason) {
    return failure(reason, "No pudimos guardar tu nombre. Inténtalo de nuevo.");
  }
}

export async function deleteHistoryAction(
  confirmation: string,
): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session)
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (confirmation.trim().toUpperCase() !== "BORRAR") {
    return { ok: false, message: "Escribe BORRAR para confirmar." };
  }
  try {
    const deleted = await apiFor(session.accessToken).deleteHistory();
    refresh();
    return {
      ok: true,
      message: `Borramos ${deleted} análisis de tu historial.`,
    };
  } catch (reason) {
    return failure(
      reason,
      "No pudimos borrar tu historial. Inténtalo de nuevo.",
    );
  }
}
