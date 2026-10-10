import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import type {
  ForgotPasswordValues,
  Overview,
  ScanRecord,
  SignInValues,
  SignUpValues,
} from "@mail-guard/contracts";
import { env } from "@/config/env";
import { api } from "@/lib/api";
import { auth, supabase } from "@/lib/supabase";
import { syncPendingScans } from "@/features/scan/model/pending-scans";

export type AccountStatus = "loading" | "idle" | "busy";

const RECENT_SCANS = 12;

/**
 * ViewModel de la cuenta: sesión (Supabase Auth) + datos de negocio
 * (API Gateway → history-service). Casos de uso UC-03 a UC-09.
 */
export function useAccountViewModel() {
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    // UC-08: primero sube lo analizado sin sesión, así las métricas lo incluyen.
    const synced = await syncPendingScans().catch(() => 0);
    if (synced > 0)
      toast.success(`Sincronizamos ${synced} análisis hechos sin sesión.`);

    const [overviewResult, scansResult] = await Promise.allSettled([
      api.getOverview(),
      api.listScans(RECENT_SCANS),
    ]);
    if (overviewResult.status === "fulfilled")
      setOverview(overviewResult.value);
    if (scansResult.status === "fulfilled") setRecentScans(scansResult.value);
    if (overviewResult.status === "rejected") {
      toast.error(
        overviewResult.reason instanceof Error
          ? overviewResult.reason.message
          : "No pudimos cargar tus métricas.",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      setSession(data.session);
      if (data.session) await loadData();
      if (active) setStatus("idle");
    });

    // Mantiene la sesión al día si el token se refresca o se cierra en otra vista.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, next) => {
        if (event === "SIGNED_OUT") {
          setSession(null);
          setOverview(null);
          setRecentScans([]);
        } else if (event === "TOKEN_REFRESHED") {
          setSession(next);
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadData]);

  /** Ejecuta una acción mostrando estado ocupado y el error como toast. */
  const run = async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    setStatus("busy");
    try {
      return await action();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      );
      return undefined;
    } finally {
      setStatus("idle");
    }
  };

  const signIn = (values: SignInValues) =>
    run(async () => {
      const { data, error } = await auth.signIn(values.email, values.password);
      if (error) throw error;
      setSession(data.session);
      await loadData();
      toast.success("Sesión iniciada correctamente.");
    });

  const signUp = (values: SignUpValues) =>
    run(async () => {
      const { data, error } = await auth.signUp(
        values.email,
        values.password,
        values.fullName,
      );
      if (error) throw error;
      setSession(data.session);
      if (data.session) await loadData();
      toast.success(
        data.session
          ? "Tu cuenta está lista."
          : "Cuenta creada. Revisa tu correo para confirmarla.",
      );
    });

  const forgotPassword = async (values: ForgotPasswordValues) =>
    (await run(async () => {
      if (!env.dashboardUrl)
        throw new Error("El servicio de recuperación no está configurado.");
      const { error } = await auth.resetPasswordForEmail(
        values.email,
        `${env.dashboardUrl}/reset-password`,
      );
      if (error) throw error;
      toast.success("Te enviamos un enlace para restablecer tu contraseña.");
      return true;
    })) ?? false;

  const signOut = () =>
    run(async () => {
      const { error } = await auth.signOut();
      if (error) throw error;
      toast.success("Sesión cerrada correctamente.");
    });

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    session,
    overview,
    recentScans,
    status,
    isRefreshing,
    dashboardUrl: env.dashboardUrl,
    signIn,
    signUp,
    forgotPassword,
    signOut,
    refresh,
  };
}

export type AccountViewModel = ReturnType<typeof useAccountViewModel>;
