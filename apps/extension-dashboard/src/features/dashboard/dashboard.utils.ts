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
  /** Correos sospechosos + peligrosos del día. */
  risky: number;
  links: number;
  /** Confianza promedio del día, o null si no hubo análisis. */
  averageTrust: number | null;
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
      risky: 0,
      links: 0,
      averageTrust: null,
      safe: 0,
      suspicious: 0,
      dangerous: 0,
      unknown: 0,
    });
  }
  const trustSum = new Map<string, number>();
  for (const scan of scans) {
    const key = dayKey(scan.analyzedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket[scan.verdict] += 1;
    bucket.total += 1;
    bucket.links += scan.links.length;
    if (scan.verdict === "dangerous" || scan.verdict === "suspicious")
      bucket.risky += 1;
    trustSum.set(key, (trustSum.get(key) ?? 0) + scan.trustScore);
  }
  for (const bucket of buckets.values()) {
    if (bucket.total)
      bucket.averageTrust = Math.round(
        (trustSum.get(bucket.date) ?? 0) / bucket.total,
      );
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

export type HistoryFilter = {
  query: string;
  verdict: Verdict | "all";
  /** Día "YYYY-MM-DD" en la zona de la app; vacío = todos. */
  day?: string;
};

export function filterScans(
  scans: ScanRecord[],
  { query, verdict, day }: HistoryFilter,
) {
  const needle = query.trim().toLowerCase();
  return scans.filter(
    (scan) =>
      (verdict === "all" || scan.verdict === verdict) &&
      (!day || dayKey(scan.analyzedAt) === day) &&
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

// ── Patrones de llegada ──────────────────────────────────────────────────

const weekdayHourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};
export const WEEKDAY_LABELS = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

export type HeatCell = {
  day: number;
  hour: number;
  total: number;
  risky: number;
};

/** Matriz 7 × 24 (día de la semana × hora, hora de Colombia). */
export function weekdayHourMatrix(scans: ScanRecord[]): HeatCell[][] {
  const matrix = WEEKDAY_LABELS.map((_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour,
      total: 0,
      risky: 0,
    })),
  );
  for (const scan of scans) {
    const parts = weekdayHourFormat.formatToParts(new Date(scan.analyzedAt));
    const day =
      WEEKDAY_INDEX[parts.find((p) => p.type === "weekday")?.value ?? ""];
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const cell = day === undefined ? undefined : matrix[day]?.[hour];
    if (!cell) continue;
    cell.total += 1;
    if (scan.verdict === "dangerous" || scan.verdict === "suspicious")
      cell.risky += 1;
  }
  return matrix;
}

// ── Qué señales delatan los correos ───────────────────────────────────────

export type SignalBreakdown = {
  key: "sender" | "content" | "links";
  label: string;
  fail: number;
  warning: number;
  pass: number;
  /** % de correos donde esta señal alertó (fallo o advertencia). */
  alertRate: number;
};

const SIGNAL_LABEL = {
  sender: "Remitente",
  content: "Contenido",
  links: "Enlaces",
} as const;

export function signalBreakdown(scans: ScanRecord[]): SignalBreakdown[] {
  return (Object.keys(SIGNAL_LABEL) as (keyof typeof SIGNAL_LABEL)[]).map(
    (key) => {
      const statuses = scans
        .map(
          (scan) => scan.signals.find((signal) => signal.key === key)?.status,
        )
        .filter((status) => status && status !== "unknown");
      const count = (status: string) =>
        statuses.filter((s) => s === status).length;
      const fail = count("fail");
      const warning = count("warning");
      return {
        key,
        label: SIGNAL_LABEL[key],
        fail,
        warning,
        pass: count("pass"),
        alertRate: statuses.length
          ? Math.round(((fail + warning) / statuses.length) * 100)
          : 0,
      };
    },
  );
}

// ── Hallazgos automáticos ─────────────────────────────────────────────────

export type Insight = {
  tone: "danger" | "warning" | "success" | "info";
  text: string;
};

const pct = (part: number, total: number) => Math.round((part / total) * 100);

/**
 * Frases cortas calculadas a partir de los datos (no de una IA): qué dominio
 * concentra las alertas, a qué hora llegan, si la confianza mejora y qué
 * señal delata más correos. Máximo `limit`, de mayor a menor relevancia.
 */
export function buildInsights(
  scans: ScanRecord[],
  now = Date.now(),
  limit = 3,
): Insight[] {
  if (scans.length < 3) return [];
  const insights: Insight[] = [];
  const risky = scans.filter(
    (s) => s.verdict === "dangerous" || s.verdict === "suspicious",
  );

  const [topDomain] = topSenderDomains(risky, 1);
  if (topDomain && risky.length >= 2) {
    insights.push({
      tone: "danger",
      text: `${topDomain.domain} concentra el ${pct(topDomain.total, risky.length)} % de tus correos con alertas.`,
    });
  }

  if (risky.length >= 3) {
    const night = risky.filter((s) => {
      const hour = Number(
        weekdayHourFormat
          .formatToParts(new Date(s.analyzedAt))
          .find((p) => p.type === "hour")?.value,
      );
      return hour >= 19 || hour < 7;
    }).length;
    const share = pct(night, risky.length);
    if (share >= 50) {
      insights.push({
        tone: "warning",
        text: `El ${share} % de las amenazas llegó de noche (7 p. m. – 7 a. m.).`,
      });
    }
  }

  const thisWeek = averageTrust(scansInRange(scans, 7, now));
  const lastWeek = averageTrust(
    scansInRange(scans, 14, now).filter(
      (s) => !scansInRange([s], 7, now).length,
    ),
  );
  if (
    thisWeek !== null &&
    lastWeek !== null &&
    Math.abs(thisWeek - lastWeek) >= 5
  ) {
    insights.push(
      thisWeek > lastWeek
        ? {
            tone: "success",
            text: `Tu confianza promedio subió ${thisWeek - lastWeek} puntos frente a la semana anterior.`,
          }
        : {
            tone: "warning",
            text: `Tu confianza promedio bajó ${lastWeek - thisWeek} puntos frente a la semana anterior.`,
          },
    );
  }

  const worstSignal = signalBreakdown(scans).sort(
    (a, b) => b.alertRate - a.alertRate,
  )[0];
  if (worstSignal && worstSignal.alertRate > 0) {
    insights.push({
      tone: "info",
      text: `La señal que más alerta es «${worstSignal.label}»: aparece en el ${worstSignal.alertRate} % de los correos.`,
    });
  }

  if (risky.length === 0) {
    insights.unshift({
      tone: "success",
      text: "Ningún correo sospechoso o peligroso en este periodo.",
    });
  }
  return insights.slice(0, limit);
}
