"use client";

import { type FormEvent, useState } from "react";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@mail-guard/contracts";
import FormField from "./FormField";
import type { AuthFormStatus } from "./useAuthForm";

type FieldErrors = Partial<Record<keyof ForgotPasswordValues, string>>;

type ForgotPasswordFormProps = {
  status: AuthFormStatus;
  onSubmit: (values: ForgotPasswordValues) => Promise<boolean>;
  onBack: () => void;
};

const initialValues: ForgotPasswordValues = { email: "" };

export default function ForgotPasswordForm({
  status,
  onSubmit,
  onBack,
}: ForgotPasswordFormProps) {
  const [values, setValues] = useState<ForgotPasswordValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const isLoading = status === "loading";

  const updateValue = (field: keyof ForgotPasswordValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = forgotPasswordSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordValues;
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
      <p className="text-sm text-guard-text-muted">
        Escribe tu correo y te enviaremos un enlace para restablecer tu
        contraseña.
      </p>
      <FormField
        id="forgot-email"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        value={values.email}
        error={errors.email}
        disabled={isLoading}
        autoComplete="email"
        onChange={(value) => updateValue("email", value)}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 cursor-pointer bg-guard-accent hover:bg-guard-accent-bright text-guard-surface font-bold text-lg py-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(200,212,0,0.15)] hover:shadow-[0_0_25px_rgba(228,241,50,0.3)] transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isLoading ? "Enviando..." : "Enviar enlace"}
      </button>
      <button
        type="button"
        onClick={onBack}
        disabled={isLoading}
        className="w-full cursor-pointer text-center text-sm text-guard-text-muted hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        Volver a iniciar sesión
      </button>
    </form>
  );
}
