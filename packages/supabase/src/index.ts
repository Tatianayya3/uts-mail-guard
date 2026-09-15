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
