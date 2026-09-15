import type { ScanAnalysis } from "@mail-guard/scan-contract";

export type MailProvider =
  "Gmail" | "Outlook" | "Proveedor compatible" | "Proveedor no compatible";

export type ScanResult = ScanAnalysis & {
  provider: MailProvider;
  subject: string;
};
