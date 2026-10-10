"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ResetPasswordValues } from "@mail-guard/contracts";
import { auth, supabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@mail-guard/supabase";

export type ResetPasswordStatus = "checking" | "ready" | "invalid" | "loading";

export function useResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState<ResetPasswordStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    // Supabase exchanges the recovery link's token for a session client-side
    // (the token lives in the URL hash, which never reaches the server) and
    // fires this event once that session is ready.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    void auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setStatus((current) =>
        current === "checking" ? (data.session ? "ready" : "invalid") : current,
      );
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (values: ResetPasswordValues) => {
    setStatus("loading");
    const { error } = await auth.updatePassword(values.password);
    if (error) {
      setStatus("ready");
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("Tu contraseña se actualizó correctamente.");
    // Keep status "loading" through the redirect so the overlay stays
    // visible instead of flashing the form again mid-navigation.
    router.push("/dashboard");
    router.refresh();
  };

  return { status, updatePassword };
}
