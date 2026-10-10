import {
  LIMITS,
  storedScanSchema,
  type StoredScan,
} from "@mail-guard/contracts";
import { api } from "@/lib/api";
import { createStore } from "@/lib/storage";

/**
 * Cola de análisis hechos sin sesión. Al iniciar sesión se sincronizan con
 * el historial (UC-08) y la cola se vacía.
 */
const store = createStore<StoredScan[]>(
  "mail-guard-pending-scans",
  Array.isArray as (v: unknown) => v is StoredScan[],
);

export function queuePendingScan(scan: StoredScan) {
  const pending = (store.read() ?? []).filter(
    (s) => !scan.emailHash || s.emailHash !== scan.emailHash,
  );
  store.write([...pending, scan].slice(-LIMITS.syncBatch));
}

export async function syncPendingScans(): Promise<number> {
  const pending = (store.read() ?? []).filter(
    (s) => storedScanSchema.safeParse(s).success,
  );
  if (pending.length === 0) return 0;
  const saved = await api.syncScans(pending);
  store.write(null);
  return saved;
}
