"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ServiceName = "gateway" | "analysis" | "history";
export type ServiceHealth = Record<ServiceName, "ok" | "down"> & {
  engine: string | null;
};
export type WakePhase = "checking" | "waking" | "ready" | "failed";

type State = { health: ServiceHealth | null; phase: WakePhase };

/** Intentos antes de rendirse: ~2 min, lo que tarda Render en despertar los tres. */
const MAX_ATTEMPTS = 16;
const RETRY_MS = 5_000;

const allUp = (h: ServiceHealth) =>
  h.gateway === "ok" && h.analysis === "ok" && h.history === "ok";

// Estado compartido: todos los indicadores de la página usan una sola consulta.
let state: State = { health: null, phase: "checking" };
let running: Promise<void> | null = null;
let started = false;
const listeners = new Set<() => void>();

const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

/**
 * Consulta /api/status y, si algún servicio está dormido, sigue llamando
 * (cada llamada lo despierta) hasta que los tres respondan.
 */
function wake(): Promise<void> {
  running ??= (async () => {
    set({ phase: "checking" });
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const health = (await res.json()) as ServiceHealth;
        if (allUp(health)) return set({ health, phase: "ready" });
        set({ health, phase: "waking" });
      } catch {
        set({ phase: "waking" });
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
    set({ phase: "failed" });
  })().finally(() => {
    running = null;
  });
  return running;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const SERVER_STATE: State = { health: null, phase: "checking" };

export function useServiceStatus() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  useEffect(() => {
    if (started) return;
    started = true;
    void wake();
  }, []);
  return { ...current, wake };
}
