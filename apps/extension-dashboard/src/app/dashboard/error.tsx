"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-guard-surface px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-8 text-center">
        <TriangleAlert
          className="mx-auto h-8 w-8 text-amber-300"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-xl font-bold">No pudimos cargar tu panel</h1>
        <p className="mt-2 text-sm text-guard-text-muted">
          Puede ser un problema temporal de conexión con el servidor. Tus datos
          están a salvo.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-guard-text-muted/70">
            Código: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-xl bg-guard-accent px-4 py-2 text-sm font-bold text-guard-surface hover:bg-guard-accent-bright"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-guard-text-muted hover:text-white"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
