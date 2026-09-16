import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import {
  computeDerivedAnalytics,
  createAnalyticsApi,
  createProfilesApi,
  type MailScanSummary,
  type Profile,
} from "@mail-guard/supabase";
import type { MailScanRecord } from "@/features/dashboard/dashboard.types";
import { getRecentScanRecords } from "@/utils/prisma/scans";
import { supabaseAnonKey, supabaseUrl } from "./env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render; middleware refreshes the
          // session cookie on the next request instead.
        }
      },
    },
  });
}

export async function getServerUser() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return { client, user };
}

function toMailScanSummary(record: MailScanRecord): MailScanSummary {
  return {
    id: record.id,
    provider: record.provider,
    subject: record.subject,
    sender_email: record.sender.email,
    sender_domain: record.sender.domain,
    trust_score: record.trustScore,
    verdict: record.verdict,
    analyzed_at: record.analyzedAt,
    created_at: record.createdAt,
  };
}

export async function getServerDashboardData(user: User) {
  const client = await createServerSupabaseClient();
  const profiles = createProfilesApi(client);
  const analytics = createAnalyticsApi(client);

  const [profileRes, analyticsRes, scans] = await Promise.all([
    profiles.getByUserId(user.id),
    analytics.getAnalyticsByUserId(user.id),
    getRecentScanRecords(user.id, 60),
  ]);

  const profile: Profile = profileRes.data ?? {
    id: user.id,
    display_name: (user.user_metadata?.full_name as string | undefined) || null,
    role: "Miembro protegido",
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
    created_at: user.created_at,
  };

  const stats =
    analyticsRes.data &&
    !(analyticsRes.data.total_scans === 0 && scans.length > 0)
      ? analyticsRes.data
      : computeDerivedAnalytics(scans.map(toMailScanSummary), user.id);

  return { profile, stats, scans };
}
