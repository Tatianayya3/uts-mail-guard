import type {
  DomainStatus,
  EmailSnapshot,
  ScanLink,
  ScanSignal,
  SignalKey,
  SignalStatus,
  Verdict,
} from "@mail-guard/contracts";
import type { DecisionEngine } from "../../application/ports";
import { describeEvidence } from "../../domain/evidence";
import { clampScore } from "../../domain/scoring";

const SYSTEM_PROMPT = `Eres un analista de seguridad de correo. Analiza el snapshot recibido y devuelve SOLO JSON válido, sin Markdown ni texto adicional.

Reglas estrictas:
- trustScore es un entero de 0 a 100: 100 = muy confiable, 0 = muy peligroso.
- verdict debe ser safe, suspicious, dangerous o unknown.
- No afirmes que SPF, DKIM o DMARC pasaron: el snapshot no incluye encabezados.
- Un dominio con formato válido no significa que sea confiable.
- Usa status unknown cuando falte evidencia. No inventes datos.
- "heuristicFindings" son hallazgos automáticos de apoyo, no verdades absolutas.
- summary y advice en español, breves y accionables.
- Incluye enlaces solo de la lista recibida.

Estructura exacta:
{"trustScore":0,"verdict":"safe","summary":"","advice":"","domainStatus":"valid|suspicious|unknown",
 "signals":[{"key":"sender|content|links","label":"","value":"","status":"pass|warning|fail|unknown","detail":""}],
 "links":[{"url":"","label":"","status":"safe|suspicious|dangerous|unknown","detail":""}]}`;

type LlmConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
};

/**
 * Adaptador para cualquier API compatible con OpenAI Chat Completions
 * (Gemini, OpenAI, Groq, Ollama…). Se conserva como alternativa a Jev.
 */
export function createLlmEngine(config: LlmConfig): DecisionEngine {
  return {
    name: `llm:${config.model}`,
    async decide(email, evidence) {
      const response = await requestWithRetry(config, {
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              email,
              heuristicFindings: describeEvidence(evidence),
            }),
          },
        ],
      });

      const payload = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const raw = payload.choices?.[0]?.message?.content;
      const content = Array.isArray(raw)
        ? raw.map((part: { text?: string }) => part.text ?? "").join("")
        : raw;
      if (typeof content !== "string")
        throw new Error("La IA no devolvió contenido.");

      let parsed: unknown;
      try {
        parsed = JSON.parse(
          content.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim(),
        );
      } catch {
        throw new Error("La IA devolvió una respuesta que no es JSON válido.");
      }
      return normalize(parsed, email, config.model);
    },
  };
}

async function requestWithRetry(
  config: LlmConfig,
  body: unknown,
): Promise<Response> {
  const retryable = new Set([429, 500, 502, 503, 504]);
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs ?? 12_000),
    });
    if (response.ok) return response;
    if (!retryable.has(response.status) || attempt >= 1) {
      throw new Error(`El proveedor de IA respondió ${response.status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
}

// ── Normalización tolerante de la salida del LLM ──────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown, fallback: string, max = 300) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

function pick<T extends string>(
  value: unknown,
  table: Record<string, T>,
  fallback: T,
): T {
  return table[String(value ?? "").toLowerCase()] ?? fallback;
}

const VERDICTS: Record<string, Verdict> = {
  safe: "safe",
  seguro: "safe",
  clean: "safe",
  suspicious: "suspicious",
  sospechoso: "suspicious",
  warning: "suspicious",
  dangerous: "dangerous",
  peligroso: "dangerous",
  malicious: "dangerous",
  phishing: "dangerous",
};
const STATUSES: Record<string, SignalStatus> = {
  pass: "pass",
  ok: "pass",
  safe: "pass",
  valid: "pass",
  warning: "warning",
  suspicious: "warning",
  fail: "fail",
  failed: "fail",
  dangerous: "fail",
  malicious: "fail",
};
const KEYS: Record<string, SignalKey> = {
  sender: "sender",
  remitente: "sender",
  content: "content",
  contenido: "content",
  body: "content",
  links: "links",
  link: "links",
  enlaces: "links",
  urls: "links",
};
const DOMAIN: Record<string, DomainStatus> = {
  valid: "valid",
  verified: "valid",
  suspicious: "suspicious",
  invalid: "suspicious",
};

export function normalize(raw: unknown, email: EmailSnapshot, model: string) {
  const value = isRecord(raw) ? raw : {};
  const allowedLinks = new Set(email.links);

  const signals: ScanSignal[] = (
    Array.isArray(value.signals) ? value.signals : []
  )
    .filter(isRecord)
    .map((s) => ({
      key: pick(s.key, KEYS, "content"),
      label: text(s.label, "Señal", 80),
      value: text(s.value, "Sin datos", 200),
      status: pick(s.status, STATUSES, "unknown"),
      detail: text(s.detail, "No hubo evidencia suficiente."),
    }))
    .slice(0, 12);

  const links: ScanLink[] = (Array.isArray(value.links) ? value.links : [])
    .filter(isRecord)
    .filter((l) => typeof l.url === "string" && allowedLinks.has(l.url))
    .map((l) => ({
      url: l.url as string,
      label: text(l.label, "Enlace", 120),
      status: pick(l.status, VERDICTS, "unknown"),
      detail: text(l.detail, "No hubo evidencia suficiente."),
    }));

  return {
    trustScore:
      typeof value.trustScore === "number" ? clampScore(value.trustScore) : 50,
    verdict: pick(value.verdict, VERDICTS, "unknown"),
    summary: text(value.summary, "", 500) || undefined,
    advice: text(value.advice, "", 300) || undefined,
    domainStatus: pick(value.domainStatus, DOMAIN, "unknown"),
    signals,
    links,
    model,
  };
}
