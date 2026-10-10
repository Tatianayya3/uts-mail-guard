import type {
  DomainStatus,
  ScanLink,
  ScanSignal,
  SignalKey,
  SignalStatus,
  Verdict,
} from "@mail-guard/contracts";
import type { Evidence, LinkEvidence, LinkFlag } from "./evidence";

/** Resultado de un motor de decisión, antes de componer la respuesta final. */
export type Decision = {
  trustScore: number;
  verdict: Verdict;
  signals: ScanSignal[];
  links: ScanLink[];
  model: string;
  summary?: string;
  advice?: string;
  domainStatus?: DomainStatus;
};

export const clampScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function verdictFromScore(score: number): Verdict {
  if (score >= 70) return "safe";
  if (score >= 40) return "suspicious";
  return "dangerous";
}

const LINK_FLAG_LABEL: Record<LinkFlag, string> = {
  "ip-host": "apunta a una IP en lugar de un dominio",
  punycode: "usa caracteres que imitan letras (punycode)",
  "lookalike-brand": "imita el dominio de una marca conocida",
  "credentials-in-url": "esconde el destino real con '@' o credenciales",
  shortener: "usa un acortador que oculta el destino",
  "insecure-http": "no usa conexión cifrada (HTTP)",
  "risky-tld": "usa una extensión de dominio de alto riesgo",
  "deep-subdomains": "tiene demasiados subdominios",
};

export function linkResult(link: LinkEvidence): ScanLink {
  return {
    url: link.url,
    label: (link.host || "Enlace").slice(0, 120),
    status: link.risk,
    detail: (link.flags.length
      ? `El enlace ${link.flags.map((f) => LINK_FLAG_LABEL[f]).join(", ")}.`
      : "No se detectaron patrones de riesgo en la URL."
    ).slice(0, 300),
  };
}

export function domainStatusOf(evidence: Evidence): DomainStatus {
  if (evidence.lookalikeBrand || evidence.riskyTld) return "suspicious";
  if (evidence.officialBrand || evidence.freeMail) return "valid";
  return "unknown";
}

function signal(
  key: SignalKey,
  label: string,
  status: SignalStatus,
  value: string,
  detail: string,
): ScanSignal {
  return {
    key,
    label,
    status,
    value: value.slice(0, 200),
    detail: detail.slice(0, 300),
  };
}

/** Señales explicables derivadas solo de evidencias objetivas. */
export function heuristicSignals(evidence: Evidence): ScanSignal[] {
  const signals: ScanSignal[] = [];

  if (evidence.lookalikeBrand) {
    signals.push(
      signal(
        "sender",
        "Remitente",
        "fail",
        `Imita a ${evidence.lookalikeBrand}`,
        `El dominio ${evidence.senderDomain} se parece al de ${evidence.lookalikeBrand} pero no le pertenece.`,
      ),
    );
  } else if (evidence.displayNameBrand) {
    signals.push(
      signal(
        "sender",
        "Remitente",
        "warning",
        `Nombre de ${evidence.displayNameBrand} sin respaldo`,
        `El nombre visible menciona a ${evidence.displayNameBrand}, pero el correo viene de ${evidence.senderDomain}.`,
      ),
    );
  } else if (evidence.riskyTld) {
    signals.push(
      signal(
        "sender",
        "Remitente",
        "warning",
        "Extensión de dominio de riesgo",
        `${evidence.senderDomain} usa una extensión frecuente en campañas de phishing.`,
      ),
    );
  } else {
    signals.push(
      signal(
        "sender",
        "Remitente",
        "pass",
        evidence.officialBrand
          ? `Dominio oficial de ${evidence.officialBrand}`
          : "Sin suplantación aparente",
        `No se detectó imitación de marcas en ${evidence.senderDomain}.`,
      ),
    );
  }

  if (!evidence.hasContent) {
    signals.push(
      signal(
        "content",
        "Contenido",
        "unknown",
        "Sin texto analizable",
        "El correo no tiene texto ni enlaces visibles; no hay evidencia suficiente.",
      ),
    );
  } else {
    const pressure = evidence.urgency.length > 0;
    const sensitive =
      evidence.credentials.length > 0 || evidence.money.length > 0;
    const status: SignalStatus =
      pressure && sensitive
        ? "fail"
        : pressure || sensitive
          ? "warning"
          : "pass";
    const found = [
      ...evidence.urgency,
      ...evidence.credentials,
      ...evidence.money,
    ].slice(0, 4);
    signals.push(
      signal(
        "content",
        "Contenido",
        status,
        status === "pass"
          ? "Sin presión ni solicitudes sensibles"
          : status === "fail"
            ? "Urgencia + datos sensibles"
            : "Lenguaje a revisar",
        found.length
          ? `Expresiones detectadas: ${found.map((f) => `"${f}"`).join(", ")}.`
          : "No se encontraron frases de urgencia ni solicitudes de datos.",
      ),
    );
  }

  if (evidence.links.length === 0) {
    signals.push(
      signal(
        "links",
        "Enlaces",
        "unknown",
        "Sin enlaces",
        "El correo no contiene enlaces externos.",
      ),
    );
  } else {
    const dangerous = evidence.links.filter(
      (l) => l.risk === "dangerous",
    ).length;
    const suspicious = evidence.links.filter(
      (l) => l.risk === "suspicious",
    ).length;
    const status: SignalStatus = dangerous
      ? "fail"
      : suspicious
        ? "warning"
        : "pass";
    signals.push(
      signal(
        "links",
        "Enlaces",
        status,
        `${evidence.links.length} ${evidence.links.length === 1 ? "revisado" : "revisados"} · ${dangerous + suspicious} con alertas`,
        dangerous
          ? `${dangerous} enlace(s) con patrones de phishing.`
          : suspicious
            ? `${suspicious} enlace(s) ocultan o debilitan su destino.`
            : "Ningún enlace presenta patrones de riesgo conocidos.",
      ),
    );
  }

  return signals;
}

/** Puntaje 0-100 basado en reglas. Es la línea base y el respaldo de los modelos. */
export function heuristicScore(evidence: Evidence): number {
  if (!evidence.hasContent) return 50;
  let score = 88;
  if (evidence.lookalikeBrand) score -= 45;
  if (evidence.displayNameBrand) score -= 25;
  if (evidence.riskyTld) score -= 15;
  if (evidence.urgency.length) score -= 10;
  if (evidence.credentials.length) score -= 20;
  if (evidence.money.length) score -= 10;
  const dangerous = evidence.links.filter((l) => l.risk === "dangerous").length;
  const suspicious = evidence.links.filter(
    (l) => l.risk === "suspicious",
  ).length;
  score -= Math.min(50, dangerous * 25);
  score -= Math.min(20, suspicious * 7);
  return clampScore(score);
}

export function heuristicDecision(evidence: Evidence): Decision {
  const trustScore = heuristicScore(evidence);
  return {
    trustScore,
    verdict: evidence.hasContent ? verdictFromScore(trustScore) : "unknown",
    signals: heuristicSignals(evidence),
    links: evidence.links.map(linkResult),
    model: "mail-guard-heuristics-v1",
    domainStatus: domainStatusOf(evidence),
  };
}

const STATUS_RANK: Record<SignalStatus, number> = {
  unknown: 0,
  pass: 1,
  warning: 2,
  fail: 3,
};
const VERDICT_RANK: Record<Verdict, number> = {
  unknown: 0,
  safe: 1,
  suspicious: 2,
  dangerous: 3,
};

/**
 * Defensa en profundidad: por cada señal se queda con la más grave entre el
 * modelo y las reglas. Una regla objetiva nunca queda "tapada" por el modelo.
 */
export function mergeSignals(
  primary: ScanSignal[],
  baseline: ScanSignal[],
): ScanSignal[] {
  const byKey = new Map<SignalKey, ScanSignal>();
  for (const item of [...baseline, ...primary]) {
    const current = byKey.get(item.key);
    if (!current || STATUS_RANK[item.status] >= STATUS_RANK[current.status]) {
      byKey.set(item.key, item);
    }
  }
  return [...byKey.values()];
}

export function mergeLinks(
  primary: ScanLink[],
  baseline: ScanLink[],
): ScanLink[] {
  const byUrl = new Map(baseline.map((link) => [link.url, link]));
  for (const link of primary) {
    const current = byUrl.get(link.url);
    if (!current || VERDICT_RANK[link.status] >= VERDICT_RANK[current.status]) {
      byUrl.set(link.url, link);
    }
  }
  return [...byUrl.values()];
}
