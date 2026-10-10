import type { Quota, StoredScan } from "@mail-guard/contracts";
import { createStore, isObject } from "@/lib/storage";

/** Último resultado y cuota, para que el popup los muestre al reabrirse. */
export const lastScanStore = createStore<StoredScan>(
  "mail-guard-scan-result",
  (v): v is StoredScan =>
    isObject(v) && typeof v.verdict === "string" && isObject(v.sender),
);

export const quotaStore = createStore<Quota>(
  "mail-guard-quota",
  (v): v is Quota =>
    isObject(v) &&
    typeof v.remaining === "number" &&
    typeof v.limit === "number",
);
