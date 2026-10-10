"use client";

import { signInSchema, type SignInValues } from "@mail-guard/contracts";
import { Button, TextField, useZodForm } from "@mail-guard/ui";

type LoginFormProps = {
  isLoading: boolean;
  onSubmit: (values: SignInValues) => Promise<void>;
  onForgotPassword: () => void;
};

export default function LoginForm({
  isLoading,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  const form = useZodForm(signInSchema, { email: "", password: "" });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <TextField
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        disabled={isLoading}
        {...form.field("email")}
      />
      <TextField
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        disabled={isLoading}
        {...form.field("password")}
      />
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onForgotPassword}
          disabled={isLoading}
          className="text-guard-accent-bright"
        >
          ¿Olvidaste tu contraseña?
        </Button>
      </div>
      <Button type="submit" size="lg" loading={isLoading} className="w-full">
        {isLoading ? "Entrando…" : "Entrar al panel"}
      </Button>
    </form>
  );
}
