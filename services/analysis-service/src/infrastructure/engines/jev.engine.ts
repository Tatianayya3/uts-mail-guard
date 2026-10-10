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
import { describeEvidence } from "../../domain/evidence";
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

const RISK_CRITERIA = {
  safe: "Legitimate: no signs of phishing, fraud, impersonation or malware.",
  suspicious: "Red flags present: the user should verify before acting.",
  dangerous: "Phishing, impersonation, fraud or malware delivery.",
} as const;

const LINK_CRITERIA = {
  safe: "The destination is coherent with the sender and the message.",
  suspicious: "The destination is unexpected, obfuscated or unrelated.",
  dangerous: "The destination is likely a phishing or malware site.",
} as const;

const TRUST_RUBRIC = [
  "Certainly malicious",
  "Likely malicious",
  "Mixed or insufficient signals",
  "Likely legitimate",
  "Certainly legitimate",
] as const;

const pct = (p: number) => `${Math.round(p * 100)} %`;

function statusFromProbability(p: number): SignalStatus {
  if (p >= 0.65) return "fail";
  if (p >= 0.35) return "warning";
  return "pass";
}

function probabilitySignal(
  key: SignalKey,
  label: string,
  p: number,
  alert: string,
  ok: string,
  detail: string,
): ScanSignal {
  const status = statusFromProbability(p);
  return {
    key,
    label,
    status,
    value: status === "pass" ? ok : `${alert} (${pct(p)})`,
    detail: `${detail} Probabilidad estimada por Jev: ${pct(p)}.`,
  };
}

/**
 * Adaptador para Jev (TypeSafe AI), un modelo «System One» diseñado para
 * decisiones acotadas: devuelve opciones, puntajes y sí/no con
 * probabilidades calibradas, en lugar de texto libre que haya que parsear.
 *
 * Una sola llamada responde todas las preguntas tipadas del correo.
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
      const linkQuestions = Object.fromEntries(
        links.map((_, i) => [
          `link_${i}`,
          choice(
            `Assess the destination of \`email.links[${i}]\` given who sent the email and what it asks for.`,
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
          heuristicFindings: describeEvidence(evidence),
        },
        questions: {
          verdict: choice(
            "Classify the security risk of `email` for its recipient. Treat `heuristicFindings` as supporting evidence, not ground truth.",
            RISK_CRITERIA,
          ),
          trust: score(
            "How trustworthy is `email` for its recipient?",
            TRUST_RUBRIC,
          ),
          impersonation: noul(
            "Does the sender impersonate a brand, institution or person (lookalike domain or misleading display name)?",
          ),
          pressure: noul(
            "Does the message use urgency, threats or rewards to pressure the recipient?",
          ),
          sensitiveRequest: noul(
            "Does the message ask for credentials, payments, banking or personal data?",
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
        return [
          {
            url,
            label: (safeHost(url) || "Enlace").slice(0, 120),
            status: answer.choice,
            detail: `Jev clasifica este destino como ${answer.choice} (confianza ${pct(answer.confidence)}).`,
          },
        ];
      });

      const content = Math.max(
        answers.pressure.noul,
        answers.sensitiveRequest.noul,
      );
      const signals: ScanSignal[] = [
        probabilitySignal(
          "sender",
          "Remitente",
          answers.impersonation.noul,
          "Posible suplantación",
          "Sin suplantación aparente",
          "Evalúa si el remitente imita a una marca, entidad o persona.",
        ),
        probabilitySignal(
          "content",
          "Contenido",
          content,
          answers.sensitiveRequest.noul >= answers.pressure.noul
            ? "Pide datos sensibles"
            : "Presión o urgencia",
          "Sin presión ni solicitudes sensibles",
          "Evalúa urgencia, amenazas, premios y solicitudes de datos o pagos.",
        ),
      ];

      return {
        trustScore,
        verdict,
        signals,
        links: scanLinks,
        model: result.model,
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
