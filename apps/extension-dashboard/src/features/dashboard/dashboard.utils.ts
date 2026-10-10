import {
  VERDICT_COLOR,
  VERDICT_LABEL,
  VERDICT_ORDER,
  type Analytics,
  type ScanRecord,
  type Verdict,
} from "@mail-guard/contracts";

const SHORT_DATE = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
});

export function formatShortDate(iso: string): string {
  return SHORT_DATE.format(new Date(iso));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatShortDate(iso);
}

const FULL_DATE = new Intl.DateTimeFormat("es", {
  dateStyle: "long",
  timeStyle: "short",
});

export function formatFullDate(iso: string): string {
  return FULL_DATE.format(new Date(iso));
}

export type TrustTrendPoint = {
  id: string;
  label: string;
  trustScore: number;
  verdict: Verdict;
};

// Chronological (oldest -> newest) trust score series for the trend chart.
// `scans` arrive newest-first from the API, so this also reverses the order.
export function buildTrustTrend(
  scans: ScanRecord[],
  limit = 20,
): TrustTrendPoint[] {
  return [...scans]
    .slice(0, limit)
    .reverse()
    .map((scan) => ({
      id: scan.id,
      label: formatShortDate(scan.analyzedAt),
      trustScore: scan.trustScore,
      verdict: scan.verdict,
    }));
}

export type DailyVerdictBucket = {
  date: string;
  label: string;
  total: number;
} & Record<Verdict, number>;

// Groups scans into day buckets (oldest -> newest) so the volume chart shows
// how many emails were scanned per verdict each day over the window.
export function bucketScansByDay(
  scans: ScanRecord[],
  days = 14,
): DailyVerdictBucket[] {
  const buckets = new Map<string, DailyVerdictBucket>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: formatShortDate(date.toISOString()),
      total: 0,
      safe: 0,
      suspicious: 0,
      dangerous: 0,
      unknown: 0,
    });
  }

  for (const scan of scans) {
    const key = scan.analyzedAt.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket[scan.verdict] += 1;
    bucket.total += 1;
  }

  return Array.from(buckets.values());
}

export type VerdictSlice = {
  key: Verdict;
  label: string;
  value: number;
  color: string;
};

export function buildVerdictBreakdown(
  stats: Pick<
    Analytics,
    "safeScans" | "suspiciousScans" | "dangerousScans" | "unknownScans"
  > | null,
): VerdictSlice[] {
  const counts: Record<Verdict, number> = {
    safe: stats?.safeScans ?? 0,
    suspicious: stats?.suspiciousScans ?? 0,
    dangerous: stats?.dangerousScans ?? 0,
    unknown: stats?.unknownScans ?? 0,
  };

  return VERDICT_ORDER.map((key) => ({
    key,
    label: VERDICT_LABEL[key],
    value: counts[key],
    color: VERDICT_COLOR[key],
  }));
}
