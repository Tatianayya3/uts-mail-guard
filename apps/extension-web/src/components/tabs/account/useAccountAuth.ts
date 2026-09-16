import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  MailScanSummary,
  Profile,
  ProfileAnalytics,
} from "@mail-guard/supabase";
import { computeDerivedAnalytics } from "@mail-guard/supabase";
import { analytics, auth, profiles } from "@/utils/supabase";
import type { SignInValues, SignUpValues } from "@mail-guard/auth-contract";
import { syncPendingScans } from "@/components/tabs/scan/scan.storage";

export type AccountStatus = "idle" | "loading" | "success" | "error";

export type AccountStats = ProfileAnalytics;

export function useAccountAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileAnalytics | null>(null);
  const [recentScans, setRecentScans] = useState<MailScanSummary[]>([]);
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const loadUserData = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      setSession(null);
      setProfile(null);
      setStats(null);
      setRecentScans([]);
      return;
    }

    try {
      await syncPendingScans(nextSession.access_token);
    } catch {
      // Pending scans sync error is non-blocking
    }

    const [profileRes, analyticsRes, scansRes] = await Promise.allSettled([
      profiles.getByUserId(nextSession.user.id),
      analytics.getAnalyticsByUserId(nextSession.user.id),
      analytics.getRecentScans(nextSession.user.id, 12),
    ]);

    let resolvedProfile: Profile | null = null;
    if (profileRes.status === "fulfilled" && profileRes.value.data) {
      resolvedProfile = profileRes.value.data;
    } else {
      // Fallback profile if row is not yet generated
      resolvedProfile = {
        id: nextSession.user.id,
        display_name:
          (nextSession.user.user_metadata?.full_name as string | undefined) ||
          null,
        role: "Miembro protegido",
        avatar_url:
          (nextSession.user.user_metadata?.avatar_url as string | undefined) ||
          null,
        created_at: nextSession.user.created_at,
      };
    }

    const resolvedScans: MailScanSummary[] =
      scansRes.status === "fulfilled" && scansRes.value.data
        ? scansRes.value.data
        : [];

    let resolvedStats: ProfileAnalytics | null =
      analyticsRes.status === "fulfilled" && analyticsRes.value.data
        ? analyticsRes.value.data
        : null;

    // If analytics table is empty or has 0 scans but mail_scans has rows, compute derived stats
    if (
      !resolvedStats ||
      (resolvedStats.total_scans === 0 && resolvedScans.length > 0)
    ) {
      resolvedStats = computeDerivedAnalytics(
        resolvedScans,
        nextSession.user.id,
      );
    }

    // Atomically set all user data alongside session so the UI never displays an intermediate state
    setProfile(resolvedProfile);
    setStats(resolvedStats);
    setRecentScans(resolvedScans);
    setSession(nextSession);
  }, []);

  const refreshStats = useCallback(async () => {
    if (!session) return;
    setIsRefreshing(true);
    try {
      await syncPendingScans(session.access_token);
      const [profileRes, analyticsRes, scansRes] = await Promise.allSettled([
        profiles.getByUserId(session.user.id),
        analytics.getAnalyticsByUserId(session.user.id),
        analytics.getRecentScans(session.user.id, 12),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.data) {
        setProfile(profileRes.value.data);
      }

      const scans =
        scansRes.status === "fulfilled" && scansRes.value.data
          ? scansRes.value.data
          : [];
      setRecentScans(scans);

      let loadedStats =
        analyticsRes.status === "fulfilled" && analyticsRes.value.data
          ? analyticsRes.value.data
          : null;

      if (!loadedStats || (loadedStats.total_scans === 0 && scans.length > 0)) {
        loadedStats = computeDerivedAnalytics(scans, session.user.id);
      }
      setStats(loadedStats);
    } finally {
      setIsRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    void auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      await loadUserData(data.session);
      if (isMounted) setStatus("idle");
    });

    return () => {
      isMounted = false;
    };
  }, [loadUserData]);

  const signIn = async (values: SignInValues) => {
    setStatus("loading");
    setMessage("");
    const { data, error } = await auth.signIn(values.email, values.password);
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    await loadUserData(data.session);
    setStatus("success");
    setMessage("Sesión iniciada correctamente.");
  };

  const signUp = async (values: SignUpValues) => {
    setStatus("loading");
    setMessage("");
    const { data, error } = await auth.signUp(
      values.email,
      values.password,
      values.fullName,
    );
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    await loadUserData(data.session);
    setStatus("success");
    setMessage(
      data.session
        ? "Tu cuenta está lista."
        : "Cuenta creada. Revisa tu correo para confirmarla.",
    );
  };

  const signOut = async () => {
    setStatus("loading");
    const { error } = await auth.signOut();
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setSession(null);
    setProfile(null);
    setStats(null);
    setRecentScans([]);
    setStatus("success");
    setMessage("Sesión cerrada correctamente.");
  };

  return {
    session,
    profile,
    stats,
    recentScans,
    status,
    isRefreshing,
    message,
    signIn,
    signUp,
    signOut,
    refreshStats,
  };
}
