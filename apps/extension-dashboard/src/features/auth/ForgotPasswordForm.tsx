"use client";

import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@mail-guard/contracts";
import { Button, TextField, useZodForm } from "@mail-guard/ui";

type ForgotPasswordFormProps = {
  isLoading: boolean;
  onSubmit: (values: ForgotPasswordValues) => Promise<boolean>;
  onBack: () => void;
};

export default function ForgotPasswordForm({
  isLoading,
  onSubmit,
  onBack,
}: ForgotPasswordFormProps) {
  const form = useZodForm(forgotPasswordSchema, { email: "" });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <p className="text-sm text-guard-text-muted">
        Escribe tu correo y te enviaremos un enlace para restablecer tu
        contraseña.
      </p>
      <TextField
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        disabled={isLoading}
        {...form.field("email")}
      />
      <Button type="submit" size="lg" loading={isLoading} className="w-full">
        {isLoading ? "Enviando..." : "Enviar enlace"}
      </Button>
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={isLoading}
        className="w-full"
      >
        Volver a iniciar sesión
      </Button>
    </form>
  );
}
