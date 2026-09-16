"use client";

import { type FormEvent, useState } from "react";
import { signUpSchema, type SignUpValues } from "@mail-guard/auth-contract";
import FormField from "./FormField";
import type { AuthFormStatus } from "./useAuthForm";

type FieldErrors = Partial<Record<keyof SignUpValues, string>>;

type RegisterFormProps = {
  status: AuthFormStatus;
  onSubmit: (values: SignUpValues) => Promise<void>;
};

const initialValues: SignUpValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterForm({ status, onSubmit }: RegisterFormProps) {
  const [values, setValues] = useState<SignUpValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const isLoading = status === "loading";

  const updateValue = (field: keyof SignUpValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = signUpSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SignUpValues;
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
        id="fullName"
        label="Nombre completo"
        type="text"
        placeholder="Juan Pérez"
        value={values.fullName ?? ""}
        error={errors.fullName}
        disabled={isLoading}
        onChange={(value) => updateValue("fullName", value)}
      />
      <FormField
        id="email"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        value={values.email}
        error={errors.email}
        disabled={isLoading}
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
        onChange={(value) => updateValue("password", value)}
      />
      <FormField
        id="confirmPassword"
        label="Confirmar contraseña"
        type="password"
        placeholder="••••••••"
        value={values.confirmPassword ?? ""}
        error={errors.confirmPassword}
        disabled={isLoading}
        onChange={(value) => updateValue("confirmPassword", value)}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-6 bg-guard-accent hover:bg-guard-accent-bright text-guard-surface font-bold text-lg py-4 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(200,212,0,0.15)] hover:shadow-[0_0_25px_rgba(228,241,50,0.3)] transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isLoading ? "Creando cuenta..." : "Comenzar ahora"}
      </button>
    </form>
  );
}
