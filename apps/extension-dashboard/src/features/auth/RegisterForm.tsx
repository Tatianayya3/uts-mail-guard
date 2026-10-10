"use client";

import { signUpSchema, type SignUpValues } from "@mail-guard/contracts";
import { Button, TextField, useZodForm } from "@mail-guard/ui";

type RegisterFormProps = {
  isLoading: boolean;
  onSubmit: (values: SignUpValues) => Promise<void>;
};

export default function RegisterForm({
  isLoading,
  onSubmit,
}: RegisterFormProps) {
  const form = useZodForm(signUpSchema, {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <TextField
        label="Nombre completo"
        placeholder="Ana Pérez"
        autoComplete="name"
        disabled={isLoading}
        {...form.field("fullName")}
      />
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
        {isLoading ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
