"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SignInValues, SignUpValues } from "@mail-guard/auth-contract";
import { auth } from "@/utils/supabase/client";

export type AuthFormStatus = "idle" | "loading" | "success" | "error";

export function useAuthForm() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthFormStatus>("idle");

  const signIn = async (values: SignInValues) => {
    setStatus("loading");
    const { error } = await auth.signIn(values.email, values.password);
    if (error) {
      setStatus("error");
      toast.error(error.message);
      return;
    }
    setStatus("success");
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
      toast.error(error.message);
      return;
    }

    setStatus("success");
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
  };

  return { status, signIn, signUp };
}
