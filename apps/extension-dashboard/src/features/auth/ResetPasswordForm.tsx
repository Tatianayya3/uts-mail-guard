"use client";

import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@mail-guard/contracts";
import { Button, TextField, useZodForm } from "@mail-guard/ui";

type ResetPasswordFormProps = {
  isLoading: boolean;
  onSubmit: (values: ResetPasswordValues) => Promise<unknown>;
  submitLabel?: string;
};

/** Nueva contraseña + confirmación. Se usa en /reset-password y en Cuenta. */
export default function ResetPasswordForm({
  isLoading,
  onSubmit,
  submitLabel = "Actualizar contraseña",
}: ResetPasswordFormProps) {
  const form = useZodForm(resetPasswordSchema, {
    password: "",
    confirmPassword: "",
  });

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
        form.reset();
      })}
      className="space-y-5"
      noValidate
    >
      <TextField
        label="Nueva contraseña"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres."
        disabled={isLoading}
        {...form.field("password")}
      />
      <TextField
        label="Confirmar contraseña"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        disabled={isLoading}
        {...form.field("confirmPassword")}
      />
      <Button type="submit" size="lg" loading={isLoading} className="w-full">
        {isLoading ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
