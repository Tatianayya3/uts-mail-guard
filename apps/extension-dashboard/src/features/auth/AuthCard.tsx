"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { useAuthForm } from "./useAuthForm";
import LoadingOverlay from "@/components/LoadingOverlay";

type AuthMode = "signin" | "signup" | "forgot";

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  signin: {
    title: "Acceso seguro",
    subtitle: "Ingresa tus credenciales para acceder.",
  },
  signup: {
    title: "Crea tu cuenta",
    subtitle: "Únete para proteger tu bandeja al instante.",
  },
  forgot: {
    title: "Recuperar contraseña",
    subtitle: "Te ayudamos a volver a acceder a tu cuenta.",
  },
};

const LOADING_COPY: Record<AuthMode, { title: string; description: string }> =
  {
    signin: {
      title: "Iniciando sesión",
      description: "Verificando tus credenciales...",
    },
    signup: {
      title: "Creando tu cuenta",
      description: "Configurando tu escudo de protección...",
    },
    forgot: {
      title: "Enviando enlace",
      description: "Preparando tu correo de recuperación...",
    },
  };

export default function AuthCard() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const { status, signIn, signUp, forgotPassword } = useAuthForm();
  const isLoading = status === "loading";
  const heading = HEADINGS[mode];
  const loadingCopy = LOADING_COPY[mode];

  return (
    <div className="bg-guard-surface-card/60 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl border border-guard-surface-raised relative group transition-all duration-500 hover:border-guard-accent/30 hover:shadow-[0_10px_40px_rgba(200,212,0,0.05)]">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-guard-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {mode !== "forgot" && (
        <div className="flex p-1 mb-8 space-x-1 bg-guard-surface-raised/50 rounded-xl border border-guard-surface-raised">
          <ModeButton active={mode === "signin"} onClick={() => setMode("signin")}>
            Iniciar sesión
          </ModeButton>
          <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
            Registrarse
          </ModeButton>
        </div>
      )}

      <div className="relative mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white transition-all duration-300">
          {heading.title}
        </h2>
        <p className="text-guard-text-muted transition-all duration-300">
          {heading.subtitle}
        </p>
      </div>

      {mode === "signup" && <RegisterForm status={status} onSubmit={signUp} />}
      {mode === "signin" && (
        <LoginForm
          status={status}
          onSubmit={signIn}
          onForgotPassword={() => setMode("forgot")}
        />
      )}
      {mode === "forgot" && (
        <ForgotPasswordForm
          status={status}
          onSubmit={async (values) => {
            const ok = await forgotPassword(values);
            if (ok) setMode("signin");
            return ok;
          }}
          onBack={() => setMode("signin")}
        />
      )}

      {isLoading && (
        <LoadingOverlay
          title={loadingCopy.title}
          description={loadingCopy.description}
        />
      )}
    </div>
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
      className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
        active
          ? "bg-guard-surface-card text-white shadow-sm border border-guard-surface-raised/50"
          : "text-guard-text-muted hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
