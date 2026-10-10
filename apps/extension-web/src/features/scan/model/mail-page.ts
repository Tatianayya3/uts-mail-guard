import { LIMITS, type EmailSnapshot } from "@mail-guard/contracts";
import {
  ALL_PROVIDER_HOSTS,
  PROVIDER_LIST_TEXT,
  PROVIDERS,
  providerOf,
  type ProviderSelectors,
  type SupportedProvider,
} from "./providers";

export type { SupportedProvider } from "./providers";
export type ActiveProvider = SupportedProvider | "unsupported";

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function getActiveProvider(): Promise<ActiveProvider> {
  return providerOf((await activeTab())?.url) ?? "unsupported";
}

/**
 * UC-01 (lado cliente): lee del DOM del correo abierto solo lo necesario
 * (remitente, asunto, texto y enlaces). Nunca adjuntos ni encabezados.
 */
export async function readOpenEmail(): Promise<{
  tabId: number;
  email: EmailSnapshot;
}> {
  const tab = await activeTab();
  const provider = providerOf(tab?.url);
  if (!tab?.id || !tab.url || !provider) {
    throw new Error(
      `Abre un correo en ${PROVIDER_LIST_TEXT} para poder analizarlo.`,
    );
  }
  if (!PROVIDERS[provider].isEmailOpen(new URL(tab.url))) {
    throw new Error(
      "Abre un correo antes de escanear. El análisis funciona sobre un mensaje abierto, no sobre la bandeja de entrada.",
    );
  }

  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractFromPage,
    args: [PROVIDERS[provider].selectors, ALL_PROVIDER_HOSTS],
  });
  const page = injection?.result as PageExtract | undefined;
  if (!page?.sender) {
    throw new Error(
      "No pudimos identificar el remitente. Espera a que el correo cargue por completo y vuelve a intentarlo.",
    );
  }

  const email: EmailSnapshot = {
    provider,
    sender: page.sender,
    senderName: page.senderName.slice(0, 200) || undefined,
    subject: page.subject.slice(0, LIMITS.subject),
    bodyText: page.bodyText.slice(0, LIMITS.bodyText),
    links: page.links.filter(isValidUrl).slice(0, LIMITS.links),
  };
  return { tabId: tab.id, email };
}

function isValidUrl(value: string): boolean {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

type PageExtract = {
  sender: string;
  senderName: string;
  subject: string;
  bodyText: string;
  links: string[];
};

/**
 * Se ejecuta DENTRO de la pestaña (chrome.scripting): debe ser autocontenida,
 * sin referencias a variables de este módulo. Usa primero los selectores del
 * proveedor y, si no encuentra nada, atributos genéricos (email, title,
 * mailto:) que comparten casi todos los webmails.
 */
export function extractFromPage(
  selectors: ProviderSelectors,
  ownHosts: string[],
): PageExtract {
  const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const GENERIC_SENDER = [
    "[email]",
    "[data-email]",
    "[data-hovercard-id*='@']",
    "[title*='@']",
    "a[href^='mailto:']",
    "[aria-label*='@']",
  ];

  const root: Element =
    document.querySelector(selectors.root) ??
    document.querySelector("[role='main'], main") ??
    document.body;

  // Algunos webmails (p. ej. Proton) pintan el cuerpo en un iframe del mismo
  // origen. Si no es accesible se ignora sin fallar.
  const frames = Array.from(root.querySelectorAll("iframe")).flatMap(
    (frame) => {
      try {
        const body = frame.contentDocument?.body;
        return body ? [body] : [];
      } catch {
        return [];
      }
    },
  );
  const scopes: Element[] = [root, ...frames];

  const emailIn = (el: Element) =>
    [
      el.getAttribute("email"),
      el.getAttribute("data-email"),
      el.getAttribute("data-hovercard-id"),
      el.getAttribute("title"),
      el.getAttribute("href"),
      el.getAttribute("aria-label"),
      el.textContent,
    ]
      .map((value) => value?.match(EMAIL)?.[0])
      .find(Boolean);

  const senderElement = [...selectors.sender, ...GENERIC_SENDER]
    .flatMap((selector) => Array.from(root.querySelectorAll(selector)))
    .find((el) => emailIn(el));
  const text = scopes
    .map((scope) => (scope as HTMLElement).innerText ?? "")
    .join("\n");
  const sender =
    (senderElement && emailIn(senderElement)) ?? text.match(EMAIL)?.[0] ?? "";
  const senderName = (
    senderElement?.getAttribute("name") ??
    senderElement?.textContent?.replace(EMAIL, "").replace(/[<>]/g, "") ??
    ""
  ).trim();

  const subject =
    (
      document.querySelector(selectors.subject) ?? root.querySelector("h1, h2")
    )?.textContent?.trim() ?? "";

  const isOwnHost = (hostname: string) =>
    ownHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  const links = Array.from(
    new Set(
      scopes
        .flatMap((scope) =>
          Array.from(scope.querySelectorAll<HTMLAnchorElement>("a[href]")),
        )
        .map((a) => a.href)
        .filter((href) => {
          try {
            const url = new URL(href);
            return /^https?:$/.test(url.protocol) && !isOwnHost(url.hostname);
          } catch {
            return false;
          }
        }),
    ),
  );

  return {
    sender,
    senderName,
    subject,
    bodyText: text.replace(/\s+/g, " ").trim(),
    links,
  };
}
