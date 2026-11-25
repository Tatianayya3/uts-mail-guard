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
    return failure(reason, "No pudimos guardar tu perfil.");
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
    return failure(reason, "No pudimos borrar tu historial.");
  }
}

/** Agentes: el usuario le pide al Centinela un ciclo ahora (semiautomático). */
export async function runSentinelAction(): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session)
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  try {
    const run = await apiFor(session.accessToken).runSentinel();
    refresh();
    return run.status === "completed"
      ? { ok: true, message: run.summary }
      : { ok: false, message: run.summary };
  } catch (reason) {
    return failure(reason, "No pudimos ejecutar al Centinela.");
  }
}

export async function markAlertsReadAction(): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session)
    return { ok: false, message: "Tu sesión expiró. Vuelve a iniciar sesión." };
  try {
    const updated = await apiFor(session.accessToken).markAlertsRead();
    refresh();
    return { ok: true, message: `Marcamos ${updated} alerta(s) como leídas.` };
  } catch (reason) {
    return failure(reason, "No pudimos marcar las alertas.");
  }
}
