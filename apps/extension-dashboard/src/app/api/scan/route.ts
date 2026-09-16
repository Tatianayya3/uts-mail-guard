import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  scanAnalysisSchema,
  scanRequestSchema,
  type EmailSnapshot,
} from "@mail-guard/scan-contract";
import { consumeScanQuota } from "./rate-limit";
import { computeEmailHash, getCachedScan, setCachedScan } from "./cache";
import { corsPreflight, jsonWithCors } from "./cors";

const responseShape = `{
  "trustScore": 0,
  "verdict": "safe",
  "summary": "Resumen breve en español, máximo 180 caracteres.",
  "advice": "Consejo general y breve para el usuario.",
  "sender": {
    "email": "remitente@dominio.com",
    "domain": "dominio.com",
    "domainStatus": "valid",
    "displayName": "Nombre visible"
  },
  "signals": [{
    "key": "sender",
    "label": "Remitente",
    "value": "Resultado breve",
    "status": "pass",
    "detail": "Evidencia concreta o unknown si no existe evidencia."
  }],
  "links": [{
    "url": "https://dominio.com",
    "label": "Destino",
    "status": "safe",
    "detail": "Razón breve del resultado."
  }],
  "model": "modelo-usado"
}`;

const analysisPrompt = `Eres un analista de seguridad de correo. Analiza el snapshot recibido y devuelve SOLO JSON válido, sin Markdown ni texto adicional.

Reglas estrictas:
- trustScore es un entero de 0 a 100 y representa riesgo: 100 = muy confiable, 0 = muy peligroso.
- verdict debe ser safe, suspicious, dangerous o unknown.
- No afirmes que SPF, DKIM o DMARC pasaron si el snapshot no contiene evidencia de esos encabezados.
- Un dominio con formato válido no significa que sea confiable.
- Usa status unknown cuando falte evidencia. No inventes datos.
- summary debe estar en español y ser breve.
- advice debe ser un consejo general, breve y accionable en español.
- Incluye una señal por cada evidencia disponible y enlaces solo de la lista recibida.
- Para un correo sin texto, con solo archivos o sin enlaces, devuelve señales "unknown" y explica que no hubo evidencia suficiente. Nunca inventes resultados.

Devuelve exactamente esta estructura:
${responseShape}`;

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsedRequest = scanRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return response({ error: "La información del correo no es válida." }, 400);
  }

  // 1. Compute deterministic hash for this email
  const emailHash = computeEmailHash(parsedRequest.data.email);

  // 2. Check if identical email analysis is already in Redis cache
  const cachedAnalysis = await getCachedScan(emailHash);
  if (cachedAnalysis) {
    return response(
      {
        ...cachedAnalysis,
        emailHash,
        cached: true,
      },
      200,
    );
  }

  const userId = await getUserId(request);
  const quotaKey =
    userId ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  let quota;
  try {
    quota = await consumeScanQuota(quotaKey, Boolean(userId));
  } catch (error) {
    console.error("scan_rate_limiter_failed", error);
    return response(
      { error: "El límite de análisis no está configurado." },
      503,
    );
  }
  if (!quota.success) {
    return response({ error: "Alcanzaste tu límite diario de análisis." }, 429);
  }

  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL;
  const model = process.env.AI_MODEL;
  if (!apiKey || !apiUrl || !model) {
    return response(
      { error: "El servicio de análisis no está configurado." },
      503,
    );
  }

  try {
    const analysis = await analyzeWithProvider(parsedRequest.data.email, {
      apiKey,
      apiUrl,
      model,
    });

    const resultWithHash = {
      ...analysis,
      emailHash,
    };

    // Store in Redis cache asynchronously
    void setCachedScan(emailHash, resultWithHash);

    return response(resultWithHash, 200);
  } catch (error) {
    console.error("scan_failed", error);
    const message =
      error instanceof Error ? error.message : "No se pudo analizar el correo.";
    return response({ error: message }, 502);
  }
}

async function getUserId(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

async function analyzeWithProvider(
  email: EmailSnapshot,
  config: { apiKey: string; apiUrl: string; model: string },
) {
  const requestBody = JSON.stringify({
    model: config.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: analysisPrompt },
      { role: "user", content: JSON.stringify(email) },
    ],
  });
  const providerResponse = await requestProvider(config, requestBody);
  if (!providerResponse.ok) {
    const providerError = await providerResponse.text();
    console.error("ai_provider_failed", {
      status: providerResponse.status,
      body: providerError.slice(0, 500),
      model: config.model,
    });
    throw new Error(
      providerResponse.status === 404
        ? "El modelo de IA no está disponible."
        : providerResponse.status === 429 || providerResponse.status >= 500
          ? "El proveedor de IA está temporalmente ocupado."
          : "El proveedor de IA rechazó la solicitud.",
    );
  }
  const payload = await providerResponse.json();
  const rawContent = payload.choices?.[0]?.message?.content;
  const content = Array.isArray(rawContent)
    ? rawContent.map((part: { text?: string }) => part.text ?? "").join("")
    : rawContent;
  if (typeof content !== "string")
    throw new Error("AI response has no content");

  const cleanJson = content.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  let rawAnalysis: unknown;
  try {
    rawAnalysis = JSON.parse(cleanJson);
  } catch {
    throw new Error("La IA devolvió una respuesta que no es JSON válido.");
  }
  const parsed = scanAnalysisSchema.safeParse(
    normalizeAnalysis(rawAnalysis, email, config.model),
  );
  if (!parsed.success) {
    console.error("scan_contract_failed", parsed.error.flatten().fieldErrors);
    throw new Error("La respuesta de IA no coincide con el formato esperado.");
  }
  return parsed.data;
}

async function requestProvider(
  config: { apiKey: string; apiUrl: string; model: string },
  body: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body,
        signal: controller.signal,
      });
      if (
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === 1
      ) {
        return response;
      }
    } catch (error) {
      if (attempt === 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error("No se pudo contactar al proveedor de IA.");
}

function normalizeAnalysis(raw: unknown, email: EmailSnapshot, model: string) {
  const value = isRecord(raw) ? raw : {};
  const sender = isRecord(value.sender) ? value.sender : {};
  const domain = email.sender.split("@")[1] ?? "";
  const signals = Array.isArray(value.signals) ? value.signals : [];
  const normalizedSignals = signals
    .filter(isRecord)
    .map((signal) => ({
      key: normalizeSignalKey(signal.key),
      label: stringValue(signal.label, "Señal"),
      value: stringValue(signal.value, "Sin datos"),
      status: normalizeSignalStatus(signal.status),
      detail: stringValue(signal.detail, "No hubo evidencia suficiente."),
    }))
    .filter((signal) => {
      if (signal.key !== "authentication") return true;
      const text = `${signal.value} ${signal.detail}`.toLowerCase();
      return (
        signal.status !== "unknown" &&
        !text.includes("no evidence") &&
        !text.includes("sin evidencia") &&
        !text.includes("no hay datos") &&
        !text.includes("not available")
      );
    });
  const fallbackSignals =
    normalizedSignals.length > 0
      ? normalizedSignals
      : [
          {
            key: "sender" as const,
            label: "Remitente",
            value: email.sender,
            status: "unknown" as const,
            detail: "Se requiere más evidencia para validar este correo.",
          },
        ];

  return {
    trustScore: numberValue(value.trustScore, 50),
    verdict: normalizeVerdict(value.verdict),
    summary: stringValue(
      value.summary,
      "No hubo evidencia suficiente para determinar el riesgo.",
    ),
    advice: stringValue(
      value.advice,
      "Verifica el remitente y evita abrir enlaces o archivos si tienes dudas.",
    ),
    sender: {
      email: emailValue(sender.email, email.sender),
      domain: stringValue(sender.domain, domain),
      domainStatus: normalizeDomainStatus(sender.domainStatus),
      displayName: stringValue(sender.displayName, "Remitente desconocido"),
    },
    signals: fallbackSignals,
    links: normalizeLinks(value.links, email.links),
    model: stringValue(value.model, model),
    // Always the real analysis time, not model output: the AI has no
    // reliable notion of "now" and tends to echo a date from the email
    // content instead, which broke the dashboard's trend chart.
    analyzedAt: new Date().toISOString(),
  };
}

function emailValue(value: unknown, fallback: string) {
  const candidate = stringValue(value, fallback);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : fallback;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 500)
    : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function normalizeVerdict(
  value: unknown,
): "safe" | "suspicious" | "dangerous" | "unknown" {
  const text = String(value ?? "").toLowerCase();
  if (["safe", "clean", "seguro", "confiable"].includes(text)) return "safe";
  if (["suspicious", "warning", "sospechoso", "riesgo"].includes(text))
    return "suspicious";
  if (["dangerous", "malicious", "peligroso", "phishing"].includes(text))
    return "dangerous";
  return "unknown";
}

function normalizeSignalKey(
  value: unknown,
): "sender" | "authentication" | "content" | "links" {
  const text = String(value ?? "").toLowerCase();
  if (
    ["authentication", "auth", "autenticacion", "autenticación"].includes(text)
  )
    return "authentication";
  if (["content", "contenido", "body"].includes(text)) return "content";
  if (["links", "link", "enlaces", "urls"].includes(text)) return "links";
  return "sender";
}

function normalizeSignalStatus(
  value: unknown,
): "pass" | "warning" | "fail" | "unknown" {
  const text = String(value ?? "").toLowerCase();
  if (
    ["pass", "passed", "ok", "safe", "valid", "clean", "válido"].includes(text)
  )
    return "pass";
  if (["warning", "warn", "suspicious", "review", "advertencia"].includes(text))
    return "warning";
  if (["fail", "failed", "dangerous", "malicious", "falló"].includes(text))
    return "fail";
  return "unknown";
}

function normalizeDomainStatus(
  value: unknown,
): "valid" | "suspicious" | "unknown" {
  const text = String(value ?? "").toLowerCase();
  if (["valid", "válido", "verified"].includes(text)) return "valid";
  if (["suspicious", "sospechoso", "invalid", "peligroso"].includes(text))
    return "suspicious";
  return "unknown";
}

function normalizeLinks(value: unknown, fallback: string[]) {
  const links = Array.isArray(value) ? value.filter(isRecord) : [];
  return links
    .map((link) => ({
      url: stringValue(link.url, fallback[0] ?? "https://invalid.local"),
      label: stringValue(link.label, "Enlace"),
      status: normalizeLinkStatus(link.status),
      detail: stringValue(link.detail, "No hubo evidencia suficiente."),
    }))
    .filter((link) => /^https?:\/\//i.test(link.url));
}

function normalizeLinkStatus(
  value: unknown,
): "safe" | "suspicious" | "dangerous" | "unknown" {
  const text = String(value ?? "").toLowerCase();
  if (["safe", "seguro", "valid", "clean"].includes(text)) return "safe";
  if (["suspicious", "sospechoso", "warning"].includes(text))
    return "suspicious";
  if (["dangerous", "peligroso", "malicious"].includes(text))
    return "dangerous";
  return "unknown";
}

function response(body: unknown, status: number) {
  return jsonWithCors(body, status);
}
