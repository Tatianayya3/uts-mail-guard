import type {
  DomainStatus,
  ScanLink,
  ScanSignal,
  SignalKey,
  SignalStatus,
  Verdict,
} from "@mail-guard/contracts";
import type { Evidence, LinkEvidence, LinkFlag } from "./evidence";
import type { NarrativeNotes } from "./narrative";

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
  /** Lo que el modelo sabe del correo, para redactar el resumen. */
  notes?: NarrativeNotes;
};

export const clampScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function verdictFromScore(score: number): Verdict {
  if (score >= 70) return "safe";
  if (score >= 40) return "suspicious";
  return "dangerous";
}

const LINK_FLAG_LABEL: Record<LinkFlag, string> = {
  "ip-host": "lleva a una dirección numérica en lugar de un sitio con nombre",
  punycode: "usa letras de otros alfabetos para imitar un sitio conocido",
  "lookalike-brand": "imita la dirección de una marca conocida",
  "credentials-in-url": "esconde su destino real con un «@» en la dirección",
  shortener: "usa un acortador que oculta a dónde lleva",
  "insecure-http": "no usa conexión segura (HTTP)",
  "risky-tld": "usa una terminación de dirección muy común en estafas",
  "deep-subdomains": "tiene demasiados subdominios, un truco para confundir",
};

export function linkResult(link: LinkEvidence): ScanLink {
  const host = link.host || "un sitio desconocido";
  const detail = link.flags.length
    ? `Este enlace ${listOf(link.flags.map((f) => LINK_FLAG_LABEL[f]))}.`
    : link.sameOrg
      ? `Lleva a ${host}, del mismo remitente.`
      : `Lleva a ${host}. No vemos señales de riesgo en la dirección.`;
  return {
    url: link.url,
    label: (link.host || "Enlace").slice(0, 120),
    status: link.risk,
    detail: detail.slice(0, 300),
  };
}

/** «a», «a y b», «a, b y c». */
function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
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

/** Señal del remitente en lenguaje natural (reglas). */
export function senderSignal(evidence: Evidence): ScanSignal {
  const domain = evidence.senderDomain || "una dirección desconocida";
  if (evidence.lookalikeBrand)
    return signal(
      "sender",
      "Remitente",
      "fail",
      `Se hace pasar por ${evidence.lookalikeBrand}`,
      `El correo viene de ${domain}, que se parece a ${evidence.lookalikeBrand} pero no es su dirección oficial.`,
    );
  if (evidence.displayNameBrand)
    return signal(
      "sender",
      "Remitente",
      "warning",
      `Dice ser ${evidence.displayNameBrand}, pero no lo es`,
      `El nombre que ves dice «${evidence.senderName}», pero el correo llega desde ${domain}, que no pertenece a ${evidence.displayNameBrand}.`,
    );
  if (evidence.riskyTld)
    return signal(
      "sender",
      "Remitente",
      "warning",
      "Dirección poco común",
      `${domain} usa una terminación muy frecuente en estafas. No significa que lo sea, pero conviene revisarlo.`,
    );
  if (evidence.officialBrand)
    return signal(
      "sender",
      "Remitente",
      "pass",
      `Viene de ${evidence.officialBrand}`,
      `${domain} es una dirección oficial de ${evidence.officialBrand}.`,
    );
  return signal(
    "sender",
    "Remitente",
    "pass",
    `Viene de ${domain}`,
    evidence.freeMail
      ? "Es una cuenta de correo personal. No vemos que se haga pasar por una marca o entidad."
      : "No vemos que se haga pasar por otra marca, entidad o persona.",
  );
}

/**
 * Señal del contenido. La urgencia SOLA no es alerta: los avisos reales
 * también tienen plazos («tu proyecto se pausará»). Preocupa cuando además
 * piden datos, códigos o dinero.
 */
export function contentSignal(evidence: Evidence): ScanSignal {
  if (!evidence.hasContent)
    return signal(
      "content",
      "Contenido",
      "unknown",
      "No hay texto para revisar",
      "El correo no tiene texto ni enlaces visibles, así que no hay información suficiente.",
    );
  const pressure = evidence.urgency.length > 0;
  const asks = [...evidence.credentials, ...evidence.money];
  if (pressure && asks.length)
    return signal(
      "content",
      "Contenido",
      "fail",
      "Te apura y te pide datos o dinero",
      "Te presiona para actuar rápido y te pide datos de tu cuenta o dinero. Es la combinación típica de una estafa.",
    );
  if (evidence.credentials.length)
    return signal(
      "content",
      "Contenido",
      "warning",
      "Te pide datos personales",
      "Te pide contraseñas, códigos o datos de tu cuenta. Las empresas serias no los piden por correo.",
    );
  if (evidence.money.length)
    return signal(
      "content",
      "Contenido",
      "warning",
      "Habla de pagos o premios",
      "Habla de pagos, cobros o premios. Confírmalo por otro medio antes de pagar o entregar datos.",
    );
  if (pressure)
    return signal(
      "content",
      "Contenido",
      "pass",
      "Menciona un plazo, sin pedirte nada",
      "Habla de que algo pasará pronto, algo normal en avisos reales, pero no te pide contraseñas, pagos ni datos.",
    );
  return signal(
    "content",
    "Contenido",
    "pass",
    "No te pide nada sensible",
    "No encontramos presión, amenazas ni solicitudes de contraseñas, pagos o datos personales.",
  );
}

/** Señal de los enlaces en conjunto. */
export function linksSignal(
  evidence: Evidence,
  links: Pick<ScanLink, "status">[] = evidence.links.map((l) => ({
    status: l.risk,
  })),
): ScanSignal {
  if (links.length === 0)
    return signal(
      "links",
      "Enlaces",
      "unknown",
      "Sin enlaces",
      "El correo no trae enlaces.",
    );
  const dangerous = links.filter((l) => l.status === "dangerous").length;
  const suspicious = links.filter((l) => l.status === "suspicious").length;
  const total = links.length;
  if (dangerous)
    return signal(
      "links",
      "Enlaces",
      "fail",
      dangerous === 1
        ? "1 enlace peligroso"
        : `${dangerous} enlaces peligrosos`,
      "Al menos un enlace lleva a un sitio con señales de estafa. No lo abras.",
    );
  if (suspicious)
    return signal(
      "links",
      "Enlaces",
      "warning",
      suspicious === 1
        ? "1 enlace para revisar"
        : `${suspicious} enlaces para revisar`,
      "Algún enlace esconde su destino real o lleva a un sitio distinto al del remitente.",
    );
  const sameOrg =
    evidence.links.length > 0 && evidence.links.every((l) => l.sameOrg);
  return signal(
    "links",
    "Enlaces",
    "pass",
    sameOrg
      ? total === 1
        ? "Lleva al mismo remitente"
        : `Los ${total} llevan al mismo remitente`
      : total === 1
        ? "1 enlace sin alertas"
        : `${total} enlaces sin alertas`,
    sameOrg
      ? `Todos los enlaces van a sitios de ${evidence.officialBrand ?? evidence.senderDomain}.`
      : "Ningún enlace muestra señales de estafa conocidas.",
  );
}

/** Señales explicables derivadas solo de evidencias objetivas. */
export function heuristicSignals(evidence: Evidence): ScanSignal[] {
  return [
    senderSignal(evidence),
    contentSignal(evidence),
    linksSignal(evidence),
  ];
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
    // Gana la más grave; en empate se queda la de las reglas (va primero),
    // porque su texto es concreto («Viene de Supabase»).
    if (!current || STATUS_RANK[item.status] > STATUS_RANK[current.status]) {
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

/** Franja de puntaje de cada veredicto (la misma de verdictFromScore). */
const BAND: Record<Verdict, [number, number]> = {
  safe: [70, 100],
  suspicious: [40, 69],
  dangerous: [0, 39],
  unknown: [0, 100],
};

/**
 * Último paso: que el veredicto, el puntaje y las señales cuenten la misma
 * historia.
 * - Defensa en profundidad: una falla objetiva nunca queda como «seguro», y
 *   si las reglas solas ya dicen «peligroso» con fallas, se respeta.
 * - Coherencia: «sospechoso» exige al menos una señal de alerta y
 *   «peligroso» al menos una falla; si no las hay, se baja el veredicto.
 * - El puntaje se lleva a la franja de su veredicto (un «seguro» no puede
 *   mostrar 65 %).
 */
export function reconcileVerdict(input: {
  verdict: Verdict;
  trustScore: number;
  signals: ScanSignal[];
  links: ScanLink[];
  baseline: Decision;
}): { verdict: Verdict; trustScore: number } {
  const { signals, links, baseline } = input;
  if (input.verdict === "unknown")
    return { verdict: "unknown", trustScore: clampScore(input.trustScore) };

  const hasFail =
    signals.some((s) => s.status === "fail") ||
    links.some((l) => l.status === "dangerous");
  const hasWarning =
    signals.some((s) => s.status === "warning") ||
    links.some((l) => l.status === "suspicious");
  const rulesSayDangerous =
    baseline.verdict === "dangerous" &&
    baseline.signals.some((s) => s.status === "fail");

  let verdict = input.verdict;
  if (rulesSayDangerous) verdict = "dangerous";
  else if (verdict === "safe" && hasFail) verdict = "suspicious";

  if (verdict === "dangerous" && !hasFail)
    verdict = hasWarning ? "suspicious" : "safe";
  if (verdict === "suspicious" && !hasFail && !hasWarning) verdict = "safe";

  const [min, max] = BAND[verdict];
  return {
    verdict,
    trustScore: clampScore(Math.min(max, Math.max(min, input.trustScore))),
  };
}
