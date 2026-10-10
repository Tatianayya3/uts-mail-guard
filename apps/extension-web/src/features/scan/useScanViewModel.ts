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
import { lastScanStore, quotaStore } from "./model/scan-store";

/**
 * ViewModel del escaneo (MVVM): expone estado listo para pintar y acciones.
 * Las vistas no saben nada de Chrome, del gateway ni del almacenamiento.
 */
export function useScanViewModel() {
  const [result, setResult] = useState<StoredScan | null>(lastScanStore.read);
  const [quota, setQuota] = useState<Quota | null>(quotaStore.read);
  const [provider, setProvider] = useState<ActiveProvider | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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
      const email = await readOpenEmail();
      const response = await api.scanEmail(email);
      // Sin sesión (o si el guardado falló) queda en cola para sincronizar luego.
      if (!response.saved) queuePendingScan(response.scan);
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
          : "No se pudo analizar este correo.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  return {
    result,
    quota,
    provider,
    isScanning,
    scan,
    clearResult: () => showResult(null),
  };
}

export type ScanViewModel = ReturnType<typeof useScanViewModel>;
