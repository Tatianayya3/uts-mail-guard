"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  ForgotPasswordValues,
  SignInValues,
  SignUpValues,
} from "@mail-guard/contracts";
import { auth } from "@/lib/supabase/client";
import { authErrorMessage } from "@mail-guard/supabase";

export type AuthFormStatus = "idle" | "loading" | "success" | "error";

export function useAuthForm() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthFormStatus>("idle");

  const signIn = async (values: SignInValues) => {
    setStatus("loading");
    const { error } = await auth.signIn(values.email, values.password);
    if (error) {
      setStatus("error");
      toast.error(authErrorMessage(error));
      return;
    }
    // Keep status "loading" so the overlay stays visible until the
    // dashboard route finishes fetching data and swaps in, instead of
    // dropping back to the bare form for a few seconds mid-navigation.
    router.push("/dashboard");
    router.refresh();
  };

  const signUp = async (values: SignUpValues) => {
    setStatus("loading");
    const { data, error } = await auth.signUp(
      values.email,
      values.password,
      values.fullName,
    );
    if (error) {
      setStatus("error");
      toast.error(authErrorMessage(error));
      return;
    }

    if (data.session) {
      // Same as signIn: leave status "loading" through the redirect.
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setStatus("success");
    toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
  };

  const forgotPassword = async (values: ForgotPasswordValues) => {
    setStatus("loading");
    const { error } = await auth.resetPasswordForEmail(
      values.email,
      `${window.location.origin}/reset-password`,
    );
    if (error) {
      setStatus("error");
      toast.error(authErrorMessage(error));
      return false;
    }
    setStatus("success");
    toast.success(
      "Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.",
    );
    return true;
  };

  return { status, signIn, signUp, forgotPassword };
}
