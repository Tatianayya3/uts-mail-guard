import type { ScanAnalysis } from "@mail-guard/scan-contract";

export type Verdict = ScanAnalysis["verdict"];
export type SignalStatus = ScanAnalysis["signals"][number]["status"];
export type ScanSignal = ScanAnalysis["signals"][number];
export type ScanLinkResult = ScanAnalysis["links"][number];

// The persisted mail_scans row never stored sender.domainStatus, so this is
// the analysis contract minus that one field, plus the DB-only id/createdAt.
export type MailScanRecord = {
  id: string;
  provider: string;
  subject: string;
  sender: {
    email: string;
    domain: string;
    displayName: string;
  };
  trustScore: number;
  verdict: Verdict;
  summary: string;
  advice: string;
  signals: ScanSignal[];
  links: ScanLinkResult[];
  model: string;
  analyzedAt: string;
  createdAt: string;
  emailHash?: string;
};
