import { NextRequest } from "next/server";
import { scanHistorySyncSchema } from "@mail-guard/scan-contract";
import { getUserClient, toRow } from "../route";
import { corsPreflight, jsonWithCors } from "../../cors";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const client = await getUserClient(request);
  if (!client)
    return jsonWithCors({ error: "Autenticación requerida." }, 401);

  const body = await request.json().catch(() => null);
  const parsed = scanHistorySyncSchema.safeParse(body);
  if (!parsed.success)
    return jsonWithCors({ error: "Los análisis no son válidos." }, 400);

  // In-memory deduplication of the batch itself
  const seenHashes = new Set<string>();
  const uniqueScans = parsed.data.scans.filter((s) => {
    if (!s.emailHash) return true;
    if (seenHashes.has(s.emailHash)) return false;
    seenHashes.add(s.emailHash);
    return true;
  });

  let { error } = await client
    .from("mail_scans")
    .insert(uniqueScans.map((s) => toRow(s, true)));

  if (error && error.message.includes("email_hash")) {
    // Fallback if column email_hash does not exist yet in Supabase
    const retry = await client
      .from("mail_scans")
      .insert(uniqueScans.map((s) => toRow(s, false)));
    error = retry.error;
  }

  if (error) {
    console.error("scan_history_sync_failed", error.message);
    return jsonWithCors(
      { error: "No se pudieron sincronizar los análisis." },
      500,
    );
  }
  return jsonWithCors({ saved: uniqueScans.length });
}
