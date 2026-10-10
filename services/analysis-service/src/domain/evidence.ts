import type { EmailSnapshot, Verdict } from "@mail-guard/contracts";
import {
  deconfuse,
  domainOf,
  foldText,
  levenshtein,
  registrableDomain,
} from "./domains";
import {
  BRANDS,
  FREE_MAIL_DOMAINS,
  KEYWORDS,
  RISKY_TLDS,
  URL_SHORTENERS,
} from "./knowledge";

export type LinkFlag =
  | "ip-host"
  | "punycode"
  | "lookalike-brand"
  | "credentials-in-url"
  | "shortener"
  | "insecure-http"
  | "risky-tld"
  | "deep-subdomains";

export type LinkEvidence = {
  url: string;
  host: string;
  flags: LinkFlag[];
  risk: Exclude<Verdict, "unknown">;
  imitatedBrand?: string;
};

export type Evidence = {
  senderEmail: string;
  senderDomain: string;
  senderName: string;
  freeMail: boolean;
  officialBrand?: string;
  /** Marca que el dominio del remitente intenta imitar. */
  lookalikeBrand?: string;
  /** Marca nombrada en el nombre visible pero no respaldada por el dominio. */
  displayNameBrand?: string;
  riskyTld: boolean;
  urgency: string[];
  credentials: string[];
  money: string[];
  links: LinkEvidence[];
  hasContent: boolean;
};

const DANGEROUS_FLAGS: LinkFlag[] = [
  "ip-host",
  "punycode",
  "lookalike-brand",
  "credentials-in-url",
];

function officialBrandOf(domain: string): string | undefined {
  const registrable = registrableDomain(domain);
  return Object.values(BRANDS).find((brand) =>
    brand.domains.some((d) => d === domain || d === registrable),
  )?.name;
}

/** Detecta dominios tipo "paypa1-secure.com" o "bancolombla.co". */
export function imitatedBrand(domain: string): string | undefined {
  if (!domain || officialBrandOf(domain)) return undefined;
  // Tokens del host completo: "secure.paypa1-login.com" → secure, paypal, login, com
  const tokens = domain
    .toLowerCase()
    .split(/[.-]/)
    .filter(Boolean)
    .map(deconfuse);
  for (const [key, brand] of Object.entries(BRANDS)) {
    if (tokens.includes(key)) return brand.name;
    // Errores de una letra solo en nombres largos (evita "apply" ≈ "apple").
    if (key.length >= 6 && tokens.some((t) => levenshtein(t, key) === 1))
      return brand.name;
  }
  return undefined;
}

/** Palabras clave presentes, sin repetir las contenidas en otra ("urgent" ⊂ "urgente"). */
function matches(text: string, words: readonly string[]): string[] {
  const found = words.filter((word) => text.includes(word));
  return found.filter(
    (word) => !found.some((other) => other !== word && other.includes(word)),
  );
}

export function inspectLink(url: string, senderDomain: string): LinkEvidence {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, host: "", flags: ["credentials-in-url"], risk: "dangerous" };
  }
  const host = parsed.hostname.toLowerCase();
  const flags: LinkFlag[] = [];
  const brand = imitatedBrand(host);
  const sameOrg = registrableDomain(host) === registrableDomain(senderDomain);

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("["))
    flags.push("ip-host");
  if (host.split(".").some((label) => label.startsWith("xn--")))
    flags.push("punycode");
  if (brand && !sameOrg) flags.push("lookalike-brand");
  if (parsed.username || parsed.password || url.includes("@"))
    flags.push("credentials-in-url");
  if (URL_SHORTENERS.has(host)) flags.push("shortener");
  if (parsed.protocol === "http:") flags.push("insecure-http");
  if (RISKY_TLDS.has(host.split(".").at(-1) ?? "")) flags.push("risky-tld");
  if (host.split(".").length > 4) flags.push("deep-subdomains");

  const risk = flags.some((flag) => DANGEROUS_FLAGS.includes(flag))
    ? "dangerous"
    : flags.length > 0
      ? "suspicious"
      : "safe";
  return { url, host, flags, risk, imitatedBrand: brand };
}

/** Extrae evidencias objetivas del correo. Función pura y determinista. */
export function collectEvidence(email: EmailSnapshot): Evidence {
  const senderDomain = domainOf(email.sender);
  const senderName = (email.senderName ?? "").trim();
  const text = foldText(`${email.subject}\n${email.bodyText}`);
  const officialBrand = officialBrandOf(senderDomain);
  const foldedName = foldText(senderName).replace(/\s+/g, "");

  const displayNameBrand = Object.entries(BRANDS).find(
    ([key, brand]) => foldedName.includes(key) && brand.name !== officialBrand,
  )?.[1].name;

  return {
    senderEmail: email.sender.toLowerCase(),
    senderDomain,
    senderName,
    freeMail: FREE_MAIL_DOMAINS.has(senderDomain),
    officialBrand,
    lookalikeBrand: imitatedBrand(senderDomain),
    displayNameBrand,
    riskyTld: RISKY_TLDS.has(senderDomain.split(".").at(-1) ?? ""),
    urgency: matches(text, KEYWORDS.urgency),
    credentials: matches(text, KEYWORDS.credentials),
    money: matches(text, KEYWORDS.money),
    links: email.links.map((url) => inspectLink(url, senderDomain)),
    hasContent: email.bodyText.trim().length > 0 || email.links.length > 0,
  };
}

/** Lista legible de hallazgos, usada como contexto para el modelo. */
export function describeEvidence(evidence: Evidence): string[] {
  const findings: string[] = [];
  if (evidence.lookalikeBrand)
    findings.push(`Sender domain imitates ${evidence.lookalikeBrand}`);
  if (evidence.displayNameBrand)
    findings.push(
      `Display name mentions ${evidence.displayNameBrand} but the domain does not belong to it`,
    );
  if (evidence.officialBrand)
    findings.push(`Sender domain belongs to ${evidence.officialBrand}`);
  if (evidence.riskyTld)
    findings.push("Sender uses a high-risk top level domain");
  if (evidence.urgency.length)
    findings.push(`Urgency language: ${evidence.urgency.join(", ")}`);
  if (evidence.credentials.length)
    findings.push(
      `Requests sensitive data: ${evidence.credentials.join(", ")}`,
    );
  if (evidence.money.length)
    findings.push(`Money related bait: ${evidence.money.join(", ")}`);
  for (const link of evidence.links.filter((l) => l.flags.length)) {
    findings.push(`Link ${link.host} flags: ${link.flags.join(", ")}`);
  }
  return findings;
}
