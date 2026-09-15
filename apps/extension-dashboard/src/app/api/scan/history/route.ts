import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  scanHistoryRequestSchema,
  type StoredScan,
} from "@mail-guard/scan-contract";

export async function POST(request: NextRequest) {
  const client = await getUserClient(request);
  if (!client)
    return NextResponse.json(
      { error: "Autenticación requerida." },
      { status: 401 },
    );

  const body = await request.json().catch(() => null);
  const parsed = scanHistoryRequestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "El análisis no es válido." },
      { status: 400 },
    );

  const scan = parsed.data.scan;

  // Deduplication check: if email_hash is present, check if already recorded
  if (scan.emailHash) {
    try {
      const { data: existing } = await client
        .from("mail_scans")
        .select("id")
        .eq("email_hash", scan.emailHash)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ saved: true, deduplicated: true });
      }
    } catch {
      // Non-blocking if column does not exist yet
    }
  }

  let { error } = await client.from("mail_scans").insert(toRow(scan, true));
  if (error && error.message.includes("email_hash")) {
    // Fallback if email_hash column does not exist yet in Supabase
    const retry = await client.from("mail_scans").insert(toRow(scan, false));
    error = retry.error;
  }

  if (error) {
    console.error("scan_history_insert_failed", error.message);
    return NextResponse.json(
      { error: "No se pudo guardar el análisis." },
      { status: 500 },
    );
  }
  return NextResponse.json({ saved: true });
}

export async function getUserClient(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await client.auth.getUser(token);
  return data.user ? client : null;
}

export function toRow(
  scan: StoredScan,
  includeHash = true,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    provider: scan.provider,
    subject: scan.subject,
    sender_email: scan.sender.email,
    sender_domain: scan.sender.domain,
    sender_display_name: scan.sender.displayName,
    trust_score: scan.trustScore,
    verdict: scan.verdict,
    summary: scan.summary,
    advice: scan.advice,
    signals: scan.signals,
    links: scan.links,
    model: scan.model,
    analyzed_at: scan.analyzedAt,
  };

  if (includeHash && scan.emailHash) {
    row.email_hash = scan.emailHash;
  }

  return row;
}
