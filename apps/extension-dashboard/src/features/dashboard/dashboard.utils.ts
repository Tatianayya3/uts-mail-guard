import {
  VERDICT_COLOR,
  VERDICT_LABEL,
  VERDICT_ORDER,
  type ScanRecord,
  type Verdict,
} from "@mail-guard/contracts";

/**
 * Zona horaria fija para agrupar por día. El panel se renderiza en el
 * servidor (UTC) y se hidrata en el navegador: usar la misma zona en ambos
 * evita que un análisis de las 9 p. m. en Colombia caiga «mañana».
 */
export const APP_TIME_ZONE = "America/Bogota";
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const shortDate = new Intl.DateTimeFormat("es", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
});
const fullDate = new Intl.DateTimeFormat("es", {
  timeZone: APP_TIME_ZONE,
  dateStyle: "long",
  timeStyle: "short",
});

/** "2026-10-10" en la zona de la app. */
export const dayKey = (date: Date | string) =>
  dayKeyFormat.format(new Date(date));
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));
export const formatFullDate = (iso: string) => fullDate.format(new Date(iso));

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatShortDate(iso);
}

// ── Rangos ────────────────────────────────────────────────────────────────

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

/** Análisis dentro de los últimos `days` días (incluido hoy). */
export function scansInRange(
  scans: ScanRecord[],
  days: number,
  now = Date.now(),
) {
  const cutoff = now - days * DAY_MS;
  return scans.filter((scan) => new Date(scan.analyzedAt).getTime() > cutoff);
}

/** Cuántos análisis hubo en el periodo actual frente al anterior de igual largo. */
export function periodDelta(
  scans: ScanRecord[],
  days: number,
  now = Date.now(),
) {
  const current = scansInRange(scans, days, now).length;
  const previous = scansInRange(scans, days * 2, now).length - current;
  return { current, previous, delta: current - previous };
}

// ── Series para gráficos ───────────────────────────────────────────────────

export type TrustTrendPoint = {
  id: string;
  label: string;
  trustScore: number;
  verdict: Verdict;
  subject: string;
};

/** Serie cronológica (antiguo → reciente). Los análisis llegan del más reciente. */
export function buildTrustTrend(
  scans: ScanRecord[],
  limit = 40,
): TrustTrendPoint[] {
  return scans
    .slice(0, limit)
    .reverse()
    .map((scan) => ({
      id: scan.id,
      label: formatShortDate(scan.analyzedAt),
      trustScore: scan.trustScore,
      verdict: scan.verdict,
      subject: scan.subject,
    }));
}

export type DailyVerdictBucket = {
  date: string;
  label: string;
  total: number;
} & Record<Verdict, number>;

/** Un balde por día del rango (antiguo → reciente), aunque esté vacío. */
export function bucketScansByDay(
  scans: ScanRecord[],
  days: number,
  now = Date.now(),
): DailyVerdictBucket[] {
  const buckets = new Map<string, DailyVerdictBucket>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now - i * DAY_MS);
    buckets.set(dayKey(date), {
      date: dayKey(date),
      label: shortDate.format(date),
      total: 0,
      safe: 0,
      suspicious: 0,
      dangerous: 0,
      unknown: 0,
    });
  }
  for (const scan of scans) {
    const bucket = buckets.get(dayKey(scan.analyzedAt));
    if (!bucket) continue;
    bucket[scan.verdict] += 1;
    bucket.total += 1;
  }
  return [...buckets.values()];
}

export type VerdictSlice = {
  key: Verdict;
  label: string;
  value: number;
  color: string;
};

export function buildVerdictBreakdown(scans: ScanRecord[]): VerdictSlice[] {
  return VERDICT_ORDER.map((key) => ({
    key,
    label: VERDICT_LABEL[key],
    value: scans.filter((scan) => scan.verdict === key).length,
    color: VERDICT_COLOR[key],
  }));
}

// ── Insights ──────────────────────────────────────────────────────────────

export type DomainInsight = {
  domain: string;
  total: number;
  risky: number;
  averageScore: number;
  worst: Verdict;
};

const VERDICT_RANK: Record<Verdict, number> = {
  unknown: 0,
  safe: 1,
  suspicious: 2,
  dangerous: 3,
};

/**
 * Dominios remitentes ordenados por riesgo: primero los que enviaron correos
 * sospechosos o peligrosos, luego por volumen.
 */
export function topSenderDomains(
  scans: ScanRecord[],
  limit = 5,
): DomainInsight[] {
  const groups = new Map<string, ScanRecord[]>();
  for (const scan of scans) {
    const domain = scan.sender.domain.toLowerCase();
    groups.set(domain, [...(groups.get(domain) ?? []), scan]);
  }
  return [...groups.entries()]
    .map(([domain, items]) => ({
      domain,
      total: items.length,
      risky: items.filter(
        (s) => s.verdict === "suspicious" || s.verdict === "dangerous",
      ).length,
      averageScore: Math.round(
        items.reduce((acc, s) => acc + s.trustScore, 0) / items.length,
      ),
      worst: items.reduce<Verdict>(
        (worst, s) =>
          VERDICT_RANK[s.verdict] > VERDICT_RANK[worst] ? s.verdict : worst,
        "unknown",
      ),
    }))
    .sort(
      (a, b) =>
        b.risky - a.risky ||
        b.total - a.total ||
        a.averageScore - b.averageScore,
    )
    .slice(0, limit);
}

export function averageTrust(scans: ScanRecord[]): number | null {
  if (scans.length === 0) return null;
  return Math.round(
    scans.reduce((acc, s) => acc + s.trustScore, 0) / scans.length,
  );
}

// ── Historial: filtros y exportación ─────────────────────────────────────────

export type HistoryFilter = { query: string; verdict: Verdict | "all" };

export function filterScans(
  scans: ScanRecord[],
  { query, verdict }: HistoryFilter,
) {
  const needle = query.trim().toLowerCase();
  return scans.filter(
    (scan) =>
      (verdict === "all" || scan.verdict === verdict) &&
      (!needle ||
        scan.subject.toLowerCase().includes(needle) ||
        scan.sender.email.toLowerCase().includes(needle) ||
        scan.sender.displayName.toLowerCase().includes(needle)),
  );
}

/**
 * CSV con «;» y BOM UTF-8: Excel en español (coma decimal) lo abre en
 * columnas y con tildes correctas.
 */
export function scansToCsv(scans: ScanRecord[]): string {
  const header = [
    "Fecha",
    "Asunto",
    "Remitente",
    "Dominio",
    "Veredicto",
    "Confianza",
    "Enlaces",
    "Modelo",
  ];
  const cell = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;
  const rows = scans.map((scan) =>
    [
      fullDate.format(new Date(scan.analyzedAt)),
      scan.subject,
      scan.sender.email,
      scan.sender.domain,
      VERDICT_LABEL[scan.verdict],
      scan.trustScore,
      scan.links.length,
      scan.model,
    ]
      .map(cell)
      .join(";"),
  );
  return `﻿${[header.map(cell).join(";"), ...rows].join("\r\n")}`;
}
