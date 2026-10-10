import type { ScanRecord } from "@mail-guard/contracts";
import { scansToCsv } from "./dashboard.utils";

function saveFile(
  content: BlobPart,
  type: string,
  name: string,
  extension: string,
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export const downloadCsv = (scans: ScanRecord[]) =>
  saveFile(
    scansToCsv(scans),
    "text/csv;charset=utf-8",
    "mail-guard-historial",
    "csv",
  );

export const downloadJson = (scans: ScanRecord[]) =>
  saveFile(
    JSON.stringify(scans, null, 2),
    "application/json",
    "mail-guard-datos",
    "json",
  );
