import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Quota, StoredScan } from "@mail-guard/contracts";
import { api } from "@/lib/api";
import {
  getActiveProvider,
  readOpenEmail,
  type ActiveProvider,
} from "./model/mail-page";
import { queuePendingScan } from "./model/pending-scans";
import { markTab } from "./model/tab-badge";
import { lastScanStore, quotaStore, savedStore } from "./model/scan-store";

/**
 * ViewModel del escaneo (MVVM): expone estado listo para pintar y acciones.
 * Las vistas no saben nada de Chrome, del gateway ni del almacenamiento.
 */
export function useScanViewModel() {
  const [result, setResult] = useState<StoredScan | null>(lastScanStore.read);
  const [quota, setQuota] = useState<Quota | null>(quotaStore.read);
  const [provider, setProvider] = useState<ActiveProvider | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastSaved, setLastSaved] = useState(() => savedStore.read() ?? false);

  useEffect(() => {
    void getActiveProvider().then(setProvider);
  }, []);

  const showResult = (scan: StoredScan | null) => {
    setResult(scan);
    lastScanStore.write(scan);
  };

  const scan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const { tabId, email } = await readOpenEmail();
      const response = await api.scanEmail(email);
      void markTab(tabId, response.scan.verdict);
      // Sin sesión (o si el guardado falló) queda en cola para sincronizar luego.
      if (!response.saved) queuePendingScan(response.scan);
      setLastSaved(response.saved);
      savedStore.write(response.saved);
      if (response.quota) {
        setQuota(response.quota);
        quotaStore.write(response.quota);
      }
      showResult(response.scan);
      if (response.cached)
        toast.info(
          "Este correo ya se había analizado: mostramos el resultado guardado.",
        );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos analizar este correo. Inténtalo de nuevo.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  return {
    /** true si el último análisis quedó guardado en la cuenta. */
    lastSaved,
    result,
    quota,
    provider,
    isScanning,
    scan,
    clearResult: () => showResult(null),
  };
}

export type ScanViewModel = ReturnType<typeof useScanViewModel>;
