import { FormEvent, useState } from "react";
import {
  signInSchema,
  signUpSchema,
  type AuthValues,
  type SignInValues,
  type SignUpValues,
} from "@mail-guard/auth-contract";
import type { AccountStatus } from "./useAccountAuth";

type AuthMode = "signin" | "signup";

type AuthFormProps = {
  mode: AuthMode;
  status: AccountStatus;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onSignIn: (values: SignInValues) => Promise<void>;
  onSignUp: (values: SignUpValues) => Promise<void>;
};

const initialValues: AuthValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function AuthForm({
  mode,
  status,
  message,
  onModeChange,
  onSignIn,
  onSignUp,
}: AuthFormProps) {
  const [values, setValues] = useState<AuthValues>(initialValues);
  const [validationMessage, setValidationMessage] = useState("");
  const isSignUp = mode === "signup";
  const displayMessage = validationMessage || message;

  const updateValue = (field: keyof AuthValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setValidationMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSignUp) {
      const result = signUpSchema.safeParse(values);
      if (!result.success) {
        setValidationMessage(
          result.error.issues[0]?.message ?? "Revisa los campos.",
        );
        return;
      }
      await onSignUp(result.data);
      return;
    }

    const result = signInSchema.safeParse(values);
    if (!result.success) {
      setValidationMessage(
        result.error.issues[0]?.message ?? "Revisa los campos.",
      );
      return;
    }
    await onSignIn(result.data);
  };

  return (
    <section className="flex flex-col pt-7">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-guard-surface-card p-1">
        <ModeButton active={!isSignUp} onClick={() => onModeChange("signin")}>
          Iniciar sesión
        </ModeButton>
        <ModeButton active={isSignUp} onClick={() => onModeChange("signup")}>
          Crear cuenta
        </ModeButton>
      </div>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-guard-accent">
          Cuenta Mail Guard
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {isSignUp ? "Crea tu cuenta" : "Qué bueno verte"}
        </h1>
        <p className="mt-2 text-sm leading-5 text-guard-text-muted">
          {isSignUp
            ? "Protege tus correos con seguridad inteligente."
            : "Inicia sesión para gestionar tu protección."}
        </p>
      </div>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-4"
      >
        {isSignUp && (
          <AuthInput
            label="Nombre completo"
            type="text"
            placeholder="Tu nombre"
            value={values.fullName ?? ""}
            onChange={(value) => updateValue("fullName", value)}
          />
        )}
        <AuthInput
          label="Correo electrónico"
          type="email"
          placeholder="tu@correo.com"
          value={values.email}
          onChange={(value) => updateValue("email", value)}
        />
        <AuthInput
          label="Contraseña"
          type="password"
          placeholder="Escribe tu contraseña"
          value={values.password}
          onChange={(value) => updateValue("password", value)}
        />
        {isSignUp && (
          <AuthInput
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite tu contraseña"
            value={values.confirmPassword ?? ""}
            onChange={(value) => updateValue("confirmPassword", value)}
          />
        )}
        {!isSignUp && (
          <button
            type="button"
            className="self-end text-xs text-guard-accent-bright"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-2 h-12 rounded-xl bg-guard-accent text-sm font-bold text-guard-surface transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
        >
          {status === "loading"
            ? "Conectando..."
            : isSignUp
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>
      {displayMessage && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-3 py-2 text-xs leading-5 ${validationMessage || status === "error" ? "bg-red-400/10 text-red-200" : "bg-guard-success-strong/10 text-guard-success"}`}
        >
          {displayMessage}
        </p>
      )}
      <div className="mt-7 flex items-center gap-3 text-[10px] text-guard-text-muted">
        <div className="h-px flex-1 bg-white/10" />
        <span>CONEXIÓN SEGURA</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <p className="mt-5 text-center text-xs text-guard-text-muted">
        Tus datos están cifrados y protegidos.
      </p>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-guard-accent text-guard-surface" : "text-guard-text-muted"}`}
    >
      {children}
    </button>
  );
}

function AuthInput({
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-medium text-guard-text-muted">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-white/10 bg-guard-surface-card px-3 text-sm text-white outline-none transition-colors placeholder:text-guard-text-muted/60 focus:border-guard-accent"
      />
    </label>
  );
}
