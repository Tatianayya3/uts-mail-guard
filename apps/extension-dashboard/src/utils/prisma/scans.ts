import "server-only";

import { db } from "@/prisma/db";
import type {
  MailScanRecord,
  ScanLinkResult,
  ScanSignal,
  Verdict,
} from "@/features/dashboard/dashboard.types";

// `db` (src/prisma/db.ts) opens a direct Postgres connection with the plain
// `postgres()` factory, not the Supabase-aware `supabase()` role-binding
// runtime — so it connects as a role that bypasses Postgres RLS entirely.
// Every query through it MUST filter by profileId itself; nothing downstream
// enforces per-user scoping the way the Supabase client (RLS via the user's
// JWT) does elsewhere in this app.
export async function getRecentScanRecords(
  profileId: string,
  limit = 60,
): Promise<MailScanRecord[]> {
  const rows = await db.orm.public.MailScans.where({ profileId })
    .orderBy((scan) => scan.createdAt.desc())
    .limit(limit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    subject: row.subject,
    sender: {
      email: row.senderEmail,
      domain: row.senderDomain,
      displayName: row.senderDisplayName,
    },
    trustScore: row.trustScore,
    verdict: row.verdict as Verdict,
    summary: row.summary,
    advice: row.advice,
    signals: row.signals as ScanSignal[],
    links: row.links as ScanLinkResult[],
    model: row._model,
    analyzedAt: row.analyzedAt.toString(),
    createdAt: row.createdAt.toString(),
    emailHash: row.emailHash ?? undefined,
  }));
}
