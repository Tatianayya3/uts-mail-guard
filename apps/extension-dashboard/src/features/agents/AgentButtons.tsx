"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck, Play } from "lucide-react";
import { Button } from "@mail-guard/ui";
import {
  markAlertsReadAction,
  runSentinelAction,
} from "@/features/dashboard/actions";

/** Ejecución semiautomática: el usuario le pide un ciclo al Centinela. */
export function RunSentinelButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      loading={isPending}
      disabled={disabled}
      icon={
        <Play className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      }
      onClick={() =>
        startTransition(async () => {
          const result = await runSentinelAction();
          (result.ok ? toast.success : toast.error)(result.message);
        })
      }
    >
      {isPending ? "Ejecutando…" : "Ejecutar Centinela"}
    </Button>
  );
}

export function MarkAlertsReadButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={isPending}
      icon={<CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />}
      onClick={() =>
        startTransition(async () => {
          const result = await markAlertsReadAction();
          (result.ok ? toast.success : toast.error)(result.message);
        })
      }
    >
      Marcar leídas
    </Button>
  );
}
