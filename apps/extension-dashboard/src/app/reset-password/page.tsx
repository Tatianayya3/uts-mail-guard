"use client";

import Link from "next/link";
import { ResetPasswordForm, useResetPassword } from "@/features/auth";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function ResetPasswordPage() {
  const { status, updatePassword } = useResetPassword();

  return (
    <div className="relative min-h-screen bg-guard-surface text-white font-sans flex flex-col overflow-hidden">
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex items-center justify-center">
        <div className="absolute top-10 md:top-32 left-10 md:left-32 w-72 h-72 bg-guard-accent rounded-full mix-blend-screen filter blur-[80px] opacity-30 animate-blob"></div>
        <div className="absolute top-40 md:top-32 right-10 md:right-32 w-72 h-72 bg-guard-success rounded-full mix-blend-screen filter blur-[80px] opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-guard-surface-card/60 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl border border-guard-surface-raised relative">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-white">
              Nueva contraseña
            </h2>
            <p className="text-guard-text-muted">
              Elige una contraseña nueva para tu cuenta.
            </p>
          </div>

          {status === "checking" && (
            <p className="text-sm text-guard-text-muted">
              Verificando tu enlace de recuperación...
            </p>
          )}

          {status === "invalid" && (
            <div className="space-y-4">
              <p className="rounded-xl bg-red-400/10 px-3 py-2.5 text-sm text-red-200">
                Este enlace no es válido o ya expiró. Solicita uno nuevo desde
                la pantalla de inicio de sesión.
              </p>
              <Link
                href="/"
                className="block w-full text-center bg-guard-accent hover:bg-guard-accent-bright text-guard-surface font-bold py-3 rounded-xl transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          )}

          {(status === "ready" || status === "loading") && (
            <ResetPasswordForm
              isLoading={status === "loading"}
              onSubmit={updatePassword}
            />
          )}

          {status === "loading" && (
            <LoadingOverlay
              title="Actualizando contraseña"
              description="Guardando tu nueva contraseña..."
            />
          )}
        </div>
      </main>
    </div>
  );
}
