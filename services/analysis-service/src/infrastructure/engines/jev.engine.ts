import {
  choice,
  noul,
  score,
  TypeSafeClient,
  type ChoiceResponse,
} from "@typesafe-ai/sdk";
import type {
  ScanLink,
  ScanSignal,
  SignalKey,
  SignalStatus,
  Verdict,
} from "@mail-guard/contracts";
import type { DecisionEngine } from "../../application/ports";
import { describeEvidence, type Evidence } from "../../domain/evidence";
import type { EmailCategory } from "../../domain/narrative";
import {
  clampScore,
  heuristicScore,
  verdictFromScore,
} from "../../domain/scoring";

const MAX_LINKS = 10;
const BODY_CHARS = 8_000;
/** Por debajo de esta confianza, el veredicto se deriva del puntaje combinado. */
const MIN_VERDICT_CONFIDENCE = 0.5;
/** Peso del modelo frente a las reglas en el puntaje final. */
const MODEL_WEIGHT = 0.7;
/** Confianza mínima para que Jev marque un enlace (evita alertas al 19 %). */
const MIN_LINK_CONFIDENCE = { suspicious: 0.6, dangerous: 0.5 } as const;
/** Probabilidad desde la que un «sí/no» de Jev cuenta como afirmativo. */
const YES = 0.5;

/*
 * Criterios en inglés (el idioma en el que Jev razona mejor). Dejan claro que
 * un aviso real con plazo NO es phishing: lo que delata una estafa es la
 * combinación de presión con pedir datos, suplantar o llevar a otro sitio.
 */
const RISK_CRITERIA = {
  safe: "Legitimate. Sender and links are consistent. Routine notices (account activity, inactivity or pausing, billing, security alerts, newsletters) are legitimate even if they mention deadlines, as long as they do not ask for credentials, codes or payments through the email.",
  suspicious:
    "Something does not add up (unexpected or mismatched sender, links to unrelated sites, unusual requests). The recipient should verify before acting.",
  dangerous:
    "Phishing, impersonation, fraud or malware: it tries to steal credentials, money or personal data, or to install something.",
} as const;

const LINK_CRITERIA = {
  safe: "The destination belongs to the sender's organization or is coherent with the message.",
  suspicious:
    "The destination is unexpected, obfuscated or unrelated to the sender.",
  dangerous: "The destination is likely a phishing or malware site.",
} as const;

const CATEGORY_CRITERIA: Record<EmailCategory, string> = {
  notice:
    "Service or account notice (activity, changes, pausing, terms, product updates).",
  security: "Security alert (sign-in, password change, verification).",
  billing: "Billing, invoice, receipt, subscription or payment notice.",
  marketing: "Newsletter, promotion or marketing.",
  personal: "Personal or work conversation between people.",
  scam: "A scam or phishing attempt disguised as any of the above.",
};

const TRUST_RUBRIC = [
  "Certainly malicious",
  "Likely malicious",
  "Mixed or insufficient signals",
  "Likely legitimate",
  "Certainly legitimate",
] as const;

function signal(
  key: SignalKey,
  status: SignalStatus,
  value: string,
  detail: string,
): ScanSignal {
  const label = key === "sender" ? "Remitente" : "Contenido";
  return { key, label, status, value, detail };
}

/** Remitente según Jev. Un dominio oficial de la marca no se toma como suplantación. */
function senderSignal(p: number, evidence: Evidence): ScanSignal {
  if (p >= 0.65 && !evidence.officialBrand)
    return signal(
      "sender",
      "fail",
      "Podría hacerse pasar por alguien",
      "Por cómo se presenta, parece imitar a una marca, entidad o persona. Verifica que de verdad sea quien dice.",
    );
  if (p >= 0.4 && !evidence.officialBrand)
    return signal(
      "sender",
      "warning",
      "No es claro quién lo envía",
      "Algo en el remitente no cuadra del todo. Confirma que sea quien dice antes de responder.",
    );
  return signal(
    "sender",
    "pass",
    "Sin señales de suplantación",
    "No parece hacerse pasar por otra marca, entidad o persona.",
  );
}

/**
 * Contenido según Jev. La presión SOLA no es alerta: los avisos reales
 * también tienen plazos. Alerta cuando pide datos o dinero.
 */
function contentSignal(pressure: number, sensitive: number): ScanSignal {
  if (sensitive >= 0.65 && pressure >= YES)
    return signal(
      "content",
      "fail",
      "Te apura y te pide datos o dinero",
      "Te presiona para actuar rápido y te pide información sensible o un pago. Es la combinación típica de una estafa.",
    );
  if (sensitive >= YES)
    return signal(
      "content",
      "warning",
      "Te pide datos personales o un pago",
      "Las empresas serias no te piden contraseñas, códigos ni datos bancarios por correo.",
    );
  if (pressure >= YES)
    return signal(
      "content",
      "pass",
      "Menciona un plazo, sin pedirte nada",
      "Habla de que algo pasará pronto, algo normal en avisos reales, pero no te pide contraseñas, pagos ni datos.",
    );
  return signal(
    "content",
    "pass",
    "No te pide nada sensible",
    "No encontramos presión ni solicitudes de contraseñas, pagos o datos personales.",
  );
}

/** Estado y explicación de un enlace según Jev, con umbral de confianza. */
function linkVerdict(
  answer: ChoiceResponse<typeof LINK_CRITERIA>,
  host: string,
  sameOrg: boolean,
): Pick<ScanLink, "status" | "detail"> {
  const place = host || "un sitio desconocido";
  if (
    answer.choice === "dangerous" &&
    answer.confidence >= MIN_LINK_CONFIDENCE.dangerous
  )
    return {
      status: "dangerous",
      detail: `Nuestro análisis indica que este enlace probablemente lleva a un sitio de estafa (${place}).`,
    };
  if (
    answer.choice === "suspicious" &&
    answer.confidence >= MIN_LINK_CONFIDENCE.suspicious &&
    !sameOrg
  )
    return {
      status: "suspicious",
      detail: `Lleva a ${place}, que no parece tener relación con quien envía el correo.`,
    };
  return {
    status: "safe",
    detail: sameOrg
      ? `Lleva a ${place}, del mismo remitente.`
      : `Lleva a ${place}. No vemos nada raro en este destino.`,
  };
}

/**
 * Adaptador para Jev (TypeSafe AI), un modelo «System One» diseñado para
 * decisiones acotadas: devuelve opciones, puntajes y sí/no con
 * probabilidades calibradas, en lugar de texto libre que haya que parsear.
 *
 * Una sola llamada responde todas las preguntas tipadas del correo. Las
 * probabilidades se usan para decidir; al usuario se le explica en palabras.
 */
export function createJevEngine(config: {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  /** Inyectable para pruebas. */
  fetch?: typeof fetch;
}): DecisionEngine {
  const client = new TypeSafeClient({
    apiKey: config.apiKey,
    defaultModel: config.model,
    timeout: config.timeoutMs ?? 10_000,
    retry: { maxRetries: 1 },
    logLevel: "off",
    fetch: config.fetch,
  });

  return {
    name: `jev:${client.defaultModel}`,
    async decide(email, evidence) {
      const links = email.links.slice(0, MAX_LINKS);
      const linkFacts = links.map(
        (url) => evidence.links.find((l) => l.url === url) ?? null,
      );
      const linkQuestions = Object.fromEntries(
        links.map((_, i) => [
          `link_${i}`,
          choice(
            `Assess the destination of \`email.links[${i}]\` given who sent the email and what it asks for. \`context.links[${i}].sameOrganizationAsSender\` tells whether it belongs to the sender's own organization.`,
            LINK_CRITERIA,
          ),
        ]),
      );

      const result = await client.systemOne({
        state: {
          email: {
            from: email.sender,
            displayName: email.senderName ?? null,
            subject: email.subject,
            body: email.bodyText.slice(0, BODY_CHARS),
            links,
          },
          context: {
            senderOrganization:
              evidence.officialBrand ?? evidence.senderDomain ?? null,
            senderIsOfficialBrandDomain: Boolean(evidence.officialBrand),
            links: links.map((url, i) => ({
              url,
              host: linkFacts[i]?.host ?? null,
              sameOrganizationAsSender: linkFacts[i]?.sameOrg ?? false,
            })),
          },
          heuristicFindings: describeEvidence(evidence),
        },
        questions: {
          verdict: choice(
            "Classify the security risk of `email` for its recipient. Use `context` and treat `heuristicFindings` as supporting evidence, not ground truth.",
            RISK_CRITERIA,
          ),
          trust: score(
            "How trustworthy is `email` for its recipient?",
            TRUST_RUBRIC,
          ),
          category: choice("What kind of email is `email`?", CATEGORY_CRITERIA),
          impersonation: noul(
            "Does the sender pretend to be a brand, institution or person it is not (lookalike domain, misleading display name, or a brand name used from an unrelated domain)? A company writing from its own domain is not impersonation.",
          ),
          pressure: noul(
            "Does the message use urgency, threats or rewards to push the recipient to act quickly?",
          ),
          sensitiveRequest: noul(
            "Does the message ask the recipient to provide credentials, verification codes, card or bank data, personal data or a payment (by replying or through a link)? Merely mentioning the sender's own settings, upgrade or billing page is not a request.",
          ),
          ...linkQuestions,
        },
      });

      const { answers } = result;
      const modelScore =
        (answers.trust.score / (TRUST_RUBRIC.length - 1)) * 100;
      const trustScore = clampScore(
        MODEL_WEIGHT * modelScore +
          (1 - MODEL_WEIGHT) * heuristicScore(evidence),
      );
      const verdict: Verdict =
        answers.verdict.confidence >= MIN_VERDICT_CONFIDENCE
          ? answers.verdict.choice
          : verdictFromScore(trustScore);

      const linkAnswers = answers as unknown as Record<
        string,
        ChoiceResponse<typeof LINK_CRITERIA> | undefined
      >;
      const scanLinks: ScanLink[] = links.flatMap((url, i) => {
        const answer = linkAnswers[`link_${i}`];
        if (!answer) return [];
        const host = linkFacts[i]?.host || safeHost(url);
        return [
          {
            url,
            label: (host || "Enlace").slice(0, 120),
            ...linkVerdict(answer, host, linkFacts[i]?.sameOrg ?? false),
          },
        ];
      });

      const pressure = answers.pressure.noul;
      const sensitive = answers.sensitiveRequest.noul;
      const category = answers.category as
        ChoiceResponse<typeof CATEGORY_CRITERIA> | undefined;

      return {
        trustScore,
        verdict,
        signals: [
          senderSignal(answers.impersonation.noul, evidence),
          contentSignal(pressure, sensitive),
        ],
        links: scanLinks,
        model: result.model,
        notes: {
          category:
            category && category.confidence >= 0.4
              ? category.choice
              : undefined,
          pressure: pressure >= YES,
          sensitive: sensitive >= YES,
        },
      };
    },
  };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
