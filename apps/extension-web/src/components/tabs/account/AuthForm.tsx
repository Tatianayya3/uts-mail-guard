import { FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  type AuthValues,
  type ForgotPasswordValues,
  type SignInValues,
  type SignUpValues,
} from "@mail-guard/auth-contract";
import ShowPasswordIcon from "@/components/icons/ShowPassword";
import HidePasswordIcon from "@/components/icons/HidePassword";
import type { AccountStatus } from "./useAccountAuth";

type AuthMode = "signin" | "signup";

type AuthFormProps = {
  mode: AuthMode;
  status: AccountStatus;
  onModeChange: (mode: AuthMode) => void;
  onSignIn: (values: SignInValues) => Promise<void>;
  onSignUp: (values: SignUpValues) => Promise<void>;
  onForgotPassword: (values: ForgotPasswordValues) => Promise<boolean>;
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
  onModeChange,
  onSignIn,
  onSignUp,
  onForgotPassword,
}: AuthFormProps) {
  const [values, setValues] = useState<AuthValues>(initialValues);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const isSignUp = mode === "signup";

  const updateValue = (field: keyof AuthValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleForgotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = forgotPasswordSchema.safeParse({ email: forgotEmail });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Revisa el correo.");
      return;
    }
    const ok = await onForgotPassword(result.data);
    if (ok) setShowForgotPassword(false);
  };

  if (showForgotPassword) {
    return (
      <section className="flex flex-col pt-7">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-guard-accent">
            Cuenta Mail Guard
          </p>
          <h1 className="mt-2 text-2xl font-bold">Recuperar contraseña</h1>
          <p className="mt-2 text-sm leading-5 text-guard-text-muted">
            Escribe tu correo y te enviaremos un enlace para restablecerla.
          </p>
        </div>
        <form
          onSubmit={(event) => void handleForgotSubmit(event)}
          className="flex flex-col gap-4"
        >
          <AuthInput
            label="Correo electrónico"
            type="email"
            placeholder="tu@correo.com"
            value={forgotEmail}
            onChange={setForgotEmail}
            autoComplete="email"
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-2 h-12 cursor-pointer rounded-xl bg-guard-accent text-sm font-bold text-guard-surface transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
          >
            {status === "loading" ? "Enviando..." : "Enviar enlace"}
          </button>
          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            disabled={status === "loading"}
            className="cursor-pointer text-center text-xs text-guard-text-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Volver a iniciar sesión
          </button>
        </form>
      </section>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSignUp) {
      const result = signUpSchema.safeParse(values);
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? "Revisa los campos.");
        return;
      }
      await onSignUp(result.data);
      return;
    }

    const result = signInSchema.safeParse(values);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Revisa los campos.");
      return;
    }
    await onSignIn(result.data);
  };

  return (
    <section className="flex flex-col pt-7">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-guard-surface-card p-1">
        <ModeButton
          active={!isSignUp}
          disabled={status === "loading"}
          onClick={() => onModeChange("signin")}
        >
          Iniciar sesión
        </ModeButton>
        <ModeButton
          active={isSignUp}
          disabled={status === "loading"}
          onClick={() => onModeChange("signup")}
        >
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
            autoComplete="name"
            disabled={status === "loading"}
          />
        )}
        <AuthInput
          label="Correo electrónico"
          type="email"
          placeholder="tu@correo.com"
          value={values.email}
          onChange={(value) => updateValue("email", value)}
          autoComplete="email"
          disabled={status === "loading"}
        />
        <AuthInput
          label="Contraseña"
          type="password"
          placeholder="Escribe tu contraseña"
          value={values.password}
          onChange={(value) => updateValue("password", value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          disabled={status === "loading"}
        />
        {isSignUp && (
          <AuthInput
            label="Confirmar contraseña"
            type="password"
            placeholder="Repite tu contraseña"
            value={values.confirmPassword ?? ""}
            onChange={(value) => updateValue("confirmPassword", value)}
            autoComplete="new-password"
            disabled={status === "loading"}
          />
        )}
        {!isSignUp && (
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            disabled={status === "loading"}
            className="block w-full cursor-pointer text-right text-xs text-guard-accent-bright hover:text-guard-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-2 h-12 cursor-pointer rounded-xl bg-guard-accent text-sm font-bold text-guard-surface transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
        >
          {status === "loading"
            ? "Conectando..."
            : isSignUp
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>
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
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 cursor-pointer rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? "bg-guard-accent text-guard-surface" : "text-guard-text-muted"}`}
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
  autoComplete,
  disabled,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="flex flex-col gap-2 text-xs font-medium text-guard-text-muted">
      {label}
      <div className="relative">
        <input
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`h-11 w-full rounded-xl border border-white/10 bg-guard-surface-card px-3 text-sm text-white outline-none transition-colors placeholder:text-guard-text-muted/60 focus:border-guard-accent disabled:opacity-50 ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-guard-text-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showPassword ? <HidePasswordIcon /> : <ShowPasswordIcon />}
          </button>
        )}
      </div>
    </label>
  );
}
