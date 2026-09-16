"use client";

import { type FormEvent, useState } from "react";
import { signInSchema, type SignInValues } from "@mail-guard/auth-contract";
import FormField from "./FormField";
import type { AuthFormStatus } from "./useAuthForm";

type FieldErrors = Partial<Record<keyof SignInValues, string>>;

type LoginFormProps = {
  status: AuthFormStatus;
  onSubmit: (values: SignInValues) => Promise<void>;
  onForgotPassword: () => void;
};

const initialValues: SignInValues = { email: "", password: "" };

export default function LoginForm({
  status,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  const [values, setValues] = useState<SignInValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const isLoading = status === "loading";

  const updateValue = (field: keyof SignInValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = signInSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SignInValues;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    await onSubmit(result.data);
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="relative space-y-5"
    >
      <FormField
        id="email"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        value={values.email}
        error={errors.email}
        disabled={isLoading}
        autoComplete="email"
        onChange={(value) => updateValue("email", value)}
      />
      <FormField
        id="password"
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        value={values.password}
        error={errors.password}
        disabled={isLoading}
        autoComplete="current-password"
        onChange={(value) => updateValue("password", value)}
      />
      <button
        type="button"
        onClick={onForgotPassword}
        disabled={isLoading}
        className="block w-full cursor-pointer text-right text-xs text-guard-accent-bright hover:text-guard-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        ¿Olvidaste tu contraseña?
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-6 cursor-pointer bg-guard-accent hover:bg-guard-accent-bright text-guard-surface font-bold text-lg py-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(200,212,0,0.15)] hover:shadow-[0_0_25px_rgba(228,241,50,0.3)] transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isLoading ? "Ingresando..." : "Entrar al Dashboard"}
      </button>
    </form>
  );
}
