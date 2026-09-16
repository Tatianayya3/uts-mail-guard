"use client";

import { type FormEvent, useState } from "react";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@mail-guard/auth-contract";
import FormField from "./FormField";
import type { ResetPasswordStatus } from "./useResetPassword";

type FieldErrors = Partial<Record<keyof ResetPasswordValues, string>>;

type ResetPasswordFormProps = {
  status: ResetPasswordStatus;
  onSubmit: (values: ResetPasswordValues) => Promise<void>;
};

const initialValues: ResetPasswordValues = {
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordForm({
  status,
  onSubmit,
}: ResetPasswordFormProps) {
  const [values, setValues] = useState<ResetPasswordValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const isLoading = status === "loading";

  const updateValue = (field: keyof ResetPasswordValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = resetPasswordSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordValues;
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
        id="password"
        label="Nueva contraseña"
        type="password"
        placeholder="••••••••"
        value={values.password}
        error={errors.password}
        disabled={isLoading}
        autoComplete="new-password"
        onChange={(value) => updateValue("password", value)}
      />
      <FormField
        id="confirmPassword"
        label="Confirmar contraseña"
        type="password"
        placeholder="••••••••"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        disabled={isLoading}
        autoComplete="new-password"
        onChange={(value) => updateValue("confirmPassword", value)}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-6 cursor-pointer bg-guard-accent hover:bg-guard-accent-bright text-guard-surface font-bold text-lg py-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(200,212,0,0.15)] hover:shadow-[0_0_25px_rgba(228,241,50,0.3)] transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isLoading ? "Actualizando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}
