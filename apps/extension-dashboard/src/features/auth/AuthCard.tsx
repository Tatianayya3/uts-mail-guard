"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import { useAuthForm } from "./useAuthForm";

type AuthMode = "signin" | "signup";

export default function AuthCard() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const { status, message, signIn, signUp } = useAuthForm();
  const isSignUp = mode === "signup";

  return (
    <div className="bg-guard-surface-card/60 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl border border-guard-surface-raised relative group transition-all duration-500 hover:border-guard-accent/30 hover:shadow-[0_10px_40px_rgba(200,212,0,0.05)]">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-guard-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="flex p-1 mb-8 space-x-1 bg-guard-surface-raised/50 rounded-xl border border-guard-surface-raised">
        <ModeButton active={!isSignUp} onClick={() => setMode("signin")}>
          Iniciar sesión
        </ModeButton>
        <ModeButton active={isSignUp} onClick={() => setMode("signup")}>
          Registrarse
        </ModeButton>
      </div>

      <div className="relative mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white transition-all duration-300">
          {isSignUp ? "Crea tu cuenta" : "Acceso seguro"}
        </h2>
        <p className="text-guard-text-muted transition-all duration-300">
          {isSignUp
            ? "Únete para proteger tu bandeja al instante."
            : "Ingresa tus credenciales para acceder."}
        </p>
      </div>

      {isSignUp ? (
        <RegisterForm status={status} onSubmit={signUp} />
      ) : (
        <LoginForm status={status} onSubmit={signIn} />
      )}

      {message && (
        <p
          role="status"
          className={`mt-5 rounded-xl px-3 py-2.5 text-xs leading-5 ${
            status === "error"
              ? "bg-red-400/10 text-red-200"
              : "bg-guard-success-strong/10 text-guard-success"
          }`}
        >
          {message}
        </p>
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
