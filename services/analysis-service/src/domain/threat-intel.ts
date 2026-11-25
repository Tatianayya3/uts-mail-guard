import type {
  ScanAnalysis,
  ScanSignal,
  SignalStatus,
  ThreatIntel,
  ThreatLevel,
  Verdict,
} from "@mail-guard/contracts";
import { registrableDomain } from "./domains";
import { buildAdvice, buildSummary } from "./narrative";
import { clampScore } from "./scoring";

/**
 * Agente Analista · conocimiento compartido con el Centinela.
 *
 * El Analista es un agente REACTIVO BASADO EN MODELO: reacciona al correo que
 * percibe con reglas condición → acción, pero además mantiene un modelo
 * interno del mundo (marcas, dominios, palabras clave) y, gracias al
 * Centinela, sabe qué dominios están en campañas activas reportadas por
 * otros usuarios aunque el correo en sí parezca inofensivo.
 */

export type ThreatHit = ThreatIntel & {
  via: "sender" | "link";
  url?: string;
};

const LEVEL_RANK: Record<ThreatLevel, number> = { suspicious: 1, dangerous: 2 };
const VERDICT_RANK: Record<Verdict, number> = {
  unknown: 0,
  safe: 1,
  suspicious: 2,
  dangerous: 3,
};
const STATUS_RANK: Record<SignalStatus, number> = {
  unknown: 0,
  pass: 1,
  warning: 2,
  fail: 3,
};
/** Puntaje máximo que puede conservar un correo de un dominio señalado. */
const SCORE_CAP: Record<ThreatLevel, number> = {
  dangerous: 15,
  suspicious: 45,
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};

/** Busca el remitente y los enlaces del correo en la base de conocimiento. */
export function matchThreats(
  analysis: ScanAnalysis,
  threats: ThreatIntel[] = [],
): ThreatHit[] {
  if (threats.length === 0) return [];
  const index = new Map(threats.map((t) => [t.domain.toLowerCase(), t]));
  const lookup = (host: string) =>
    host ? (index.get(host) ?? index.get(registrableDomain(host))) : undefined;

  const hits: ThreatHit[] = [];
  const sender = lookup(analysis.sender.domain.toLowerCase());
  if (sender) hits.push({ ...sender, via: "sender" });
  for (const link of analysis.links) {
    const threat = lookup(hostOf(link.url));
    if (threat) hits.push({ ...threat, via: "link", url: link.url });
  }
  return hits;
}

/**
 * Ajusta el veredicto con lo que sabe el Centinela. Nunca mejora un
 * resultado: solo lo empeora (defensa en profundidad).
 */
export function applyThreatIntel(
  analysis: ScanAnalysis,
  hits: ThreatHit[],
): ScanAnalysis {
  if (hits.length === 0) return analysis;

  const worst = hits.reduce((a, b) =>
    LEVEL_RANK[b.level] > LEVEL_RANK[a.level] ? b : a,
  );
  const senderHit = hits.find((h) => h.via === "sender");
  const linkHits = new Map(
    hits.filter((h) => h.via === "link").map((h) => [h.url, h]),
  );

  let signals = analysis.signals;
  if (senderHit) {
    const status: SignalStatus =
      senderHit.level === "dangerous" ? "fail" : "warning";
    const centinela: ScanSignal = {
      key: "sender",
      label: "Remitente",
      status,
      value: "Reportado por el agente Centinela",
      detail:
        `${senderHit.domain} está en la base de conocimiento del Centinela: ` +
        `${senderHit.reports} reporte(s) de otros usuarios en una campaña ` +
        `${senderHit.level === "dangerous" ? "peligrosa" : "sospechosa"} activa.`,
    };
    const current = signals.find((s) => s.key === "sender");
    signals =
      current && STATUS_RANK[current.status] > STATUS_RANK[status]
        ? signals
        : [centinela, ...signals.filter((s) => s.key !== "sender")];
  }

  const links = analysis.links.map((link) => {
    const hit = linkHits.get(link.url);
    if (!hit) return link;
    const status: Verdict =
      VERDICT_RANK[link.status] >= VERDICT_RANK[hit.level]
        ? link.status
        : hit.level;
    return {
      ...link,
      status,
      detail: `Dominio reportado por el agente Centinela. ${link.detail}`.slice(
        0,
        300,
      ),
    };
  });

  const trustScore = clampScore(
    Math.min(analysis.trustScore, SCORE_CAP[worst.level]),
  );
  // "unknown" tiene rango 0, así que también pasa al nivel de la amenaza.
  const verdict: Verdict =
    VERDICT_RANK[analysis.verdict] >= VERDICT_RANK[worst.level]
      ? analysis.verdict
      : worst.level;
  const changed = verdict !== analysis.verdict;

  const intro = `Agente Centinela: ${worst.domain} forma parte de una campaña ${
    worst.level === "dangerous" ? "peligrosa" : "sospechosa"
  } reportada por otros usuarios. `;
  const base = changed ? buildSummary(verdict, signals) : analysis.summary;

  return {
    ...analysis,
    trustScore,
    verdict,
    signals,
    links,
    sender: senderHit
      ? { ...analysis.sender, domainStatus: "suspicious" }
      : analysis.sender,
    summary: `${intro}${base}`.slice(0, 500),
    advice: changed ? buildAdvice(verdict) : analysis.advice,
    model: `${analysis.model} + centinela`.slice(0, 100),
  };
}
