import { useState } from "react";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type SignInValues,
  type SignUpValues,
} from "@mail-guard/contracts";
import { Button, TextField, cn, useZodForm } from "@mail-guard/ui";

type AuthMode = "signin" | "signup" | "forgot";

type AuthFormProps = {
  isBusy: boolean;
  onSignIn: (values: SignInValues) => Promise<unknown>;
  onSignUp: (values: SignUpValues) => Promise<unknown>;
  onForgotPassword: (values: ForgotPasswordValues) => Promise<boolean>;
};

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  signin: {
    title: "Qué bueno verte",
    subtitle: "Inicia sesión para guardar tu historial.",
  },
  signup: {
    title: "Crea tu cuenta",
    subtitle: "Guarda tus análisis y consulta tus métricas.",
  },
  forgot: {
    title: "Recuperar contraseña",
    subtitle: "Te enviaremos un enlace para restablecerla.",
  },
};

export default function AuthForm({
  isBusy,
  onSignIn,
  onSignUp,
  onForgotPassword,
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const heading = HEADINGS[mode];

  return (
    <section className="flex flex-col pt-6">
      {mode !== "forgot" && (
        <div
          className="mb-6 grid grid-cols-2 rounded-xl bg-guard-surface-card p-1"
          role="tablist"
        >
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => setMode(tab)}
              disabled={isBusy}
              className={cn(
                "h-9 cursor-pointer rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                mode === tab
                  ? "bg-guard-accent text-guard-surface"
                  : "text-guard-text-muted hover:text-white",
              )}
            >
              {tab === "signin" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-guard-accent">
          Cuenta Mail Guard
        </p>
        <h1 className="mt-2 text-2xl font-bold">{heading.title}</h1>
        <p className="mt-1 text-sm leading-5 text-guard-text-muted">
          {heading.subtitle}
        </p>
      </div>

      {mode === "signin" && (
        <SignInForm
          isBusy={isBusy}
          onSubmit={onSignIn}
          onForgot={() => setMode("forgot")}
        />
      )}
      {mode === "signup" && <SignUpForm isBusy={isBusy} onSubmit={onSignUp} />}
      {mode === "forgot" && (
        <ForgotForm
          isBusy={isBusy}
          onSubmit={async (values) => {
            if (await onForgotPassword(values)) setMode("signin");
          }}
          onBack={() => setMode("signin")}
        />
      )}

      <p className="mt-6 text-center text-[11px] text-guard-text-muted">
        Puedes analizar correos sin cuenta: se guardan aquí y se sincronizan al
        iniciar sesión.
      </p>
    </section>
  );
}

function SignInForm({
  isBusy,
  onSubmit,
  onForgot,
}: {
  isBusy: boolean;
  onSubmit: (values: SignInValues) => Promise<unknown>;
  onForgot: () => void;
}) {
  const form = useZodForm(signInSchema, { email: "", password: "" });
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        size="sm"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        disabled={isBusy}
        {...form.field("email")}
      />
      <TextField
        size="sm"
        label="Contraseña"
        type="password"
        placeholder="Tu contraseña"
        autoComplete="current-password"
        disabled={isBusy}
        {...form.field("password")}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onForgot}
        disabled={isBusy}
        className="self-end text-guard-accent-bright"
      >
        ¿Olvidaste tu contraseña?
      </Button>
      <Button type="submit" size="lg" loading={isBusy}>
        {isBusy ? "Conectando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}

function SignUpForm({
  isBusy,
  onSubmit,
}: {
  isBusy: boolean;
  onSubmit: (values: SignUpValues) => Promise<unknown>;
}) {
  const form = useZodForm(signUpSchema, {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        size="sm"
        label="Nombre completo"
        placeholder="Tu nombre"
        autoComplete="name"
        disabled={isBusy}
        {...form.field("fullName")}
      />
      <TextField
        size="sm"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        disabled={isBusy}
        {...form.field("email")}
      />
      <TextField
        size="sm"
        label="Contraseña"
        type="password"
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        disabled={isBusy}
        {...form.field("password")}
      />
      <TextField
        size="sm"
        label="Confirmar contraseña"
        type="password"
        placeholder="Repite tu contraseña"
        autoComplete="new-password"
        disabled={isBusy}
        {...form.field("confirmPassword")}
      />
      <Button type="submit" size="lg" loading={isBusy}>
        {isBusy ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}

function ForgotForm({
  isBusy,
  onSubmit,
  onBack,
}: {
  isBusy: boolean;
  onSubmit: (values: ForgotPasswordValues) => Promise<unknown>;
  onBack: () => void;
}) {
  const form = useZodForm(forgotPasswordSchema, { email: "" });
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <TextField
        size="sm"
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        disabled={isBusy}
        {...form.field("email")}
      />
      <Button type="submit" size="lg" loading={isBusy}>
        {isBusy ? "Enviando..." : "Enviar enlace"}
      </Button>
      <Button variant="ghost" onClick={onBack} disabled={isBusy}>
        Volver a iniciar sesión
      </Button>
    </form>
  );
}
