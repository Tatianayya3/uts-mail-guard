import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  role: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

// Exportamos la fábrica del cliente
export const createSupabaseInstance = (
  url: string,
  anonKey: string,
): SupabaseClient => {
  if (!url || !anonKey) {
    throw new Error("Supabase URL and Anon Key are required");
  }
  return createClient(url, anonKey);
};

// Exportamos la lógica de Auth envolviendo el cliente
export const createAuthApi = (supabase: SupabaseClient) => ({
  signUp: async (email: string, password: string, fullName?: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
  },
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getSession: async () => {
    return await supabase.auth.getSession();
  },
  resetPasswordForEmail: async (email: string, redirectTo: string) => {
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },
  updatePassword: async (password: string) => {
    return await supabase.auth.updateUser({ password });
  },
});

export const createProfilesApi = (supabase: SupabaseClient) => ({
  getByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, display_name, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();

    return { data: data as Profile | null, error };
  },
});

export type ProfileAnalytics = {
  profile_id: string;
  total_scans: number;
  safe_scans: number;
  suspicious_scans: number;
  dangerous_scans: number;
  unknown_scans: number;
  links_reviewed: number;
  average_trust_score: number;
  last_scanned_at: string | null;
  updated_at: string;
};

export type MailScanSummary = {
  id: string;
  provider: string;
  subject: string;
  sender_email: string;
  sender_domain: string;
  trust_score: number;
  verdict: "safe" | "suspicious" | "dangerous" | "unknown";
  analyzed_at: string;
  created_at: string;
};

// Derives the same shape as the `profile_analytics` table from raw scans, for
// accounts whose aggregate row hasn't been generated (or refreshed) yet.
export const computeDerivedAnalytics = (
  scans: MailScanSummary[],
  profileId: string,
): ProfileAnalytics => {
  const total = scans.length;
  const safe = scans.filter((s) => s.verdict === "safe").length;
  const suspicious = scans.filter((s) => s.verdict === "suspicious").length;
  const dangerous = scans.filter((s) => s.verdict === "dangerous").length;
  const unknown = scans.filter((s) => s.verdict === "unknown").length;
  const average = total
    ? Math.round(scans.reduce((acc, s) => acc + s.trust_score, 0) / total)
    : 100;

  return {
    profile_id: profileId,
    total_scans: total,
    safe_scans: safe,
    suspicious_scans: suspicious,
    dangerous_scans: dangerous,
    unknown_scans: unknown,
    links_reviewed: 0,
    average_trust_score: average,
    last_scanned_at: scans[0]?.analyzed_at ?? null,
    updated_at: new Date().toISOString(),
  };
};

export const createAnalyticsApi = (supabase: SupabaseClient) => ({
  getAnalyticsByUserId: async (userId: string) => {
    const { data, error } = await supabase
      .from("profile_analytics")
      .select("*")
      .eq("profile_id", userId)
      .maybeSingle();

    return { data: data as ProfileAnalytics | null, error };
  },
  getRecentScans: async (userId: string, limit = 12) => {
    const { data, error } = await supabase
      .from("mail_scans")
      .select(
        "id, provider, subject, sender_email, sender_domain, trust_score, verdict, analyzed_at, created_at",
      )
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return { data: (data ?? []) as MailScanSummary[], error };
  },
});
