import type { ScanResult } from "./scan.types";

const PENDING_SCANS_KEY = "mail-guard-pending-scans";
const apiUrl = import.meta.env.VITE_SCAN_API_URL as string | undefined;

type StoredScan = ScanResult & { queuedAt: string };

export function queueAnonymousScan(result: ScanResult) {
  const pending = readPendingScans();
  pending.push({ ...result, queuedAt: new Date().toISOString() });
  localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending.slice(-25)));
}

export async function persistScan(result: ScanResult, accessToken?: string) {
  if (!accessToken || !apiUrl) {
    queueAnonymousScan(result);
    return;
  }

  const response = await fetch(`${apiUrl}/api/scan/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ scan: result }),
  });

  if (!response.ok) {
    throw new Error("No se pudo guardar el análisis.");
  }
}

export async function syncPendingScans(accessToken: string) {
  const pending = readPendingScans();
  if (!pending.length || !apiUrl) return;

  const response = await fetch(`${apiUrl}/api/scan/history/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ scans: pending }),
  });

  if (!response.ok) throw new Error("No se pudieron sincronizar los análisis.");
  localStorage.removeItem(PENDING_SCANS_KEY);
}

function readPendingScans(): StoredScan[] {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_SCANS_KEY) ?? "[]");
    return Array.isArray(value) ? (value as StoredScan[]) : [];
  } catch {
    return [];
  }
}
