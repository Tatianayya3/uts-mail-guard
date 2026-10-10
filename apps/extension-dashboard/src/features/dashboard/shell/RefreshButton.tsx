"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Vuelve a pedir los datos al servidor sin recargar la página. */
export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-label="Actualizar datos"
      className="flex items-center gap-2 rounded-xl border border-guard-surface-raised bg-guard-surface-card/60 px-3.5 py-2 text-xs font-semibold text-guard-text-muted transition-colors hover:border-guard-accent/30 hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      <RefreshCw
        className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-guard-accent" : ""}`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">
        {isPending ? "Actualizando…" : "Actualizar"}
      </span>
    </button>
  );
}
