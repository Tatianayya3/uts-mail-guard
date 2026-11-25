import type { ScanLink, ScanSignal, Verdict } from "@mail-guard/contracts";
import type { Evidence } from "./evidence";

/**
 * Redacción para la persona que recibió el correo: frases cortas, en segunda
 * persona, sin porcentajes ni jerga. Primero qué pasa, después qué hacer.
 * Todo sale de hechos verificables (evidencias, señales y enlaces): nunca se
 * inventa texto.
 */

/** Tipo de correo según el modelo (opcional: las reglas no lo conocen). */
export type EmailCategory =
  "notice" | "security" | "billing" | "marketing" | "personal" | "scam";

/** Con el adjetivo ya concordado («una alerta… legítima»). */
const CATEGORY_TEXT: Record<Exclude<EmailCategory, "scam">, string> = {
  notice: "un aviso legítimo",
  security: "una alerta de seguridad legítima",
  billing: "un correo legítimo de facturación",
  marketing: "un correo promocional legítimo",
  personal: "un mensaje personal legítimo",
};

/** Lo que el modelo aporta además de las señales (todo opcional). */
export type NarrativeNotes = {
  category?: EmailCategory;
  /** Menciona plazos, consecuencias o premios. */
  pressure?: boolean;
  /** Pide contraseñas, códigos, pagos o datos personales. */
  sensitive?: boolean;
};

type NarrativeInput = {
  verdict: Verdict;
  evidence: Evidence;
  signals: ScanSignal[];
  links: ScanLink[];
  notes?: NarrativeNotes;
};

const isAlert = (s: ScanSignal) =>
  s.status === "fail" || s.status === "warning";

/** Une frases como en español: «a», «a y b», «a, b y c». */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

const capitalize = (text: string) =>
  text ? text[0]!.toUpperCase() + text.slice(1) : text;

/** La marca que el correo dice ser (oficial, por el nombre o imitada). */
function claimedBrand(evidence: Evidence): string | undefined {
  return (
    evidence.officialBrand ??
    evidence.displayNameBrand ??
    evidence.lookalikeBrand
  );
}

/** Razones concretas por las que el correo preocupa (para sospechoso/peligroso). */
function reasons(input: NarrativeInput): string[] {
  const { evidence, signals, links } = input;
  const out: string[] = [];
  const signal = (key: ScanSignal["key"]) => signals.find((s) => s.key === key);

  const sender = signal("sender");
  if (sender && isAlert(sender)) {
    if (evidence.lookalikeBrand)
      out.push(
        `se hace pasar por ${evidence.lookalikeBrand} desde una dirección que no es la oficial`,
      );
    else if (evidence.displayNameBrand)
      out.push(
        `dice ser ${evidence.displayNameBrand}, pero escribe desde ${evidence.senderDomain}`,
      );
    else if (evidence.riskyTld)
      out.push("escribe desde una dirección poco común en correos legítimos");
    else out.push("parece hacerse pasar por una marca, entidad o persona");
  }

  const content = signal("content");
  if (content && isAlert(content)) {
    out.push(
      content.status === "fail"
        ? "te apura para que entregues datos o hagas un pago"
        : "te pide datos personales, códigos o pagos",
    );
  }

  const dangerous = links.filter((l) => l.status === "dangerous").length;
  const suspicious = links.filter((l) => l.status === "suspicious").length;
  if (dangerous)
    out.push(
      dangerous === 1
        ? "trae un enlace a un sitio con señales de estafa"
        : "trae enlaces a sitios con señales de estafa",
    );
  else if (suspicious)
    out.push(
      suspicious === 1
        ? "trae un enlace que esconde o cambia su destino"
        : "trae enlaces que esconden o cambian su destino",
    );

  return out;
}

/** Por qué el correo parece legítimo (para seguro). */
function reassurance(input: NarrativeInput): string {
  const { evidence, links, notes } = input;
  const parts: string[] = [];
  const coherent =
    links.length > 0 &&
    evidence.links.length > 0 &&
    evidence.links.every((l) => l.sameOrg);

  const from = evidence.officialBrand
    ? `Viene de ${evidence.senderDomain}, una dirección oficial de ${evidence.officialBrand}`
    : `Viene de ${evidence.senderDomain}`;
  parts.push(
    coherent ? `${from}, y sus enlaces llevan al mismo sitio.` : `${from}.`,
  );

  // Si el contenido tiene una advertencia leve, el resumen no puede decir
  // «no te pide nada»: lo menciona con calma.
  const content = input.signals.find((s) => s.key === "content");
  if (content && isAlert(content)) {
    parts.push(
      "Menciona datos personales o pagos, así que revísalo con calma antes de responder o pagar.",
    );
    return parts.join(" ");
  }

  const pressure = notes?.pressure ?? evidence.urgency.length > 0;
  parts.push(
    pressure
      ? "Habla de un plazo o de algo que pasará pronto, algo normal en avisos reales, pero no te pide contraseñas, pagos ni datos personales."
      : "No te pide contraseñas, pagos ni datos personales.",
  );
  return parts.join(" ");
}

/** Resumen del veredicto en lenguaje natural. */
export function narrateSummary(input: NarrativeInput): string {
  const { verdict, notes } = input;
  const why = reasons(input);

  if (verdict === "unknown")
    return "No hay suficiente información para saber si este correo es seguro: no trae texto ni enlaces que podamos revisar.";

  if (verdict === "safe") {
    const what =
      notes?.category && notes.category !== "scam"
        ? `Parece ${CATEGORY_TEXT[notes.category]}`
        : "Parece un correo legítimo";
    const brand = input.evidence.officialBrand
      ? ` de ${input.evidence.officialBrand}`
      : "";
    return `${what}${brand}. ${reassurance(input)}`.slice(0, 500);
  }

  const opening =
    verdict === "dangerous"
      ? "Este correo parece una estafa"
      : "Ten cuidado con este correo";
  const body = why.length
    ? `: ${listJoin(why.slice(0, 3))}.`
    : verdict === "dangerous"
      ? ": tiene varias señales típicas de phishing."
      : ": algo no cuadra y conviene confirmarlo antes de actuar.";
  return `${opening}${body}`.slice(0, 500);
}

/** Qué hacer ahora, según el veredicto. */
export function narrateAdvice(input: NarrativeInput): string {
  const { verdict, evidence } = input;
  const brand = claimedBrand(evidence);
  const site = brand ? `al sitio oficial de ${brand}` : "al sitio oficial";
  const confirm = brand
    ? ` o contacta a ${brand} por sus canales oficiales`
    : " o confirma por otro medio con quien lo envía";
  switch (verdict) {
    case "safe":
      return evidence.senderDomain
        ? `Si quieres confirmarlo, entra a ${evidence.senderDomain} escribiendo tú la dirección en el navegador, en lugar de usar el enlace.`
        : "Aun así, nunca compartas contraseñas ni códigos por correo.";
    case "suspicious":
      return `No abras enlaces ni adjuntos todavía. Entra tú mismo ${site}${confirm}.`;
    case "dangerous":
      return "No hagas clic ni respondas. Repórtalo como phishing en tu correo y elimínalo. Si ya ingresaste datos, cambia tu contraseña de inmediato.";
    default:
      return "Si no esperabas este correo, no abras sus enlaces ni archivos.";
  }
}

// ── Versión genérica (sin evidencias), usada al reescribir un resultado ──

const OPENING: Record<Verdict, string> = {
  safe: "Parece un correo legítimo.",
  suspicious: "Ten cuidado con este correo.",
  dangerous: "Este correo parece una estafa.",
  unknown: "No hay suficiente información para saber si este correo es seguro.",
};

const ADVICE: Record<Verdict, string> = {
  safe: "Aun así, nunca compartas contraseñas ni códigos por correo.",
  suspicious:
    "No abras enlaces ni adjuntos todavía. Entra tú mismo al sitio oficial o confirma por otro medio.",
  dangerous:
    "No hagas clic ni respondas. Repórtalo como phishing en tu correo y elimínalo. Si ya ingresaste datos, cambia tu contraseña de inmediato.",
  unknown: "Si no esperabas este correo, no abras sus enlaces ni archivos.",
};

/** Resumen a partir solo de las señales (cuando no hay evidencias a mano). */
export function buildSummary(verdict: Verdict, signals: ScanSignal[]): string {
  const alerts = signals.filter(isAlert).map((s) => s.value.toLowerCase());
  const detail =
    verdict !== "safe" && alerts.length
      ? ` ${capitalize(listJoin(alerts.slice(0, 3)))}.`
      : "";
  return `${OPENING[verdict]}${detail}`.slice(0, 500);
}

export function buildAdvice(verdict: Verdict): string {
  return ADVICE[verdict];
}
