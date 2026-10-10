import { LIMITS, type EmailSnapshot } from "@mail-guard/contracts";

export type SupportedProvider = "Gmail" | "Outlook";
export type ActiveProvider = SupportedProvider | "unsupported";

const PROVIDER_HOSTS: Record<SupportedProvider, string[]> = {
  Gmail: ["mail.google.com"],
  Outlook: [
    "outlook.live.com",
    "outlook.office.com",
    "outlook.office365.com",
    "outlook.cloud.microsoft",
  ],
};

function providerOf(url: string | undefined): SupportedProvider | null {
  if (!url) return null;
  const { hostname } = new URL(url);
  for (const [provider, hosts] of Object.entries(PROVIDER_HOSTS)) {
    if (
      hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    ) {
      return provider as SupportedProvider;
    }
  }
  return null;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function getActiveProvider(): Promise<ActiveProvider> {
  return providerOf((await activeTab())?.url) ?? "unsupported";
}

/** Gmail: #inbox/<id>; Outlook: …/id/<id>. La bandeja (lista) no se analiza. */
function isEmailOpen(url: URL, provider: SupportedProvider): boolean {
  if (provider === "Gmail") {
    const segments = url.hash.replace(/^#/, "").split("/").filter(Boolean);
    return (
      segments.length >= 2 && /^[A-Za-z0-9_-]{10,}$/.test(segments.at(-1) ?? "")
    );
  }
  return /\/id\//.test(url.pathname);
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
    throw new Error("Abre un correo en Gmail u Outlook para escanearlo.");
  }
  if (!isEmailOpen(new URL(tab.url), provider)) {
    throw new Error(
      "Abre un correo para analizarlo. El escáner funciona sobre un correo abierto, no sobre la bandeja de entrada.",
    );
  }

  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractFromPage,
    args: [provider],
  });
  const page = injection?.result as PageExtract | undefined;
  if (!page?.sender) {
    throw new Error("No encontramos el remitente del correo abierto.");
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
 * sin referencias a variables de este módulo.
 */
function extractFromPage(provider: SupportedProvider): PageExtract {
  const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const root =
    document.querySelector(
      provider === "Gmail"
        ? "[role='main']"
        : "[role='main'], [data-app-section='MailReadCompose']",
    ) ?? document.body;
  const text = (root as HTMLElement).innerText ?? "";

  const senderSelectors =
    provider === "Gmail"
      ? ["span.gD[email]", "span[email]", "[data-hovercard-id*='@']"]
      : [
          "[data-testid*='sender'] [title*='@']",
          "[email]",
          "[data-testid*='sender']",
          "[aria-label*='@']",
        ];
  const senderElement = senderSelectors
    .flatMap((selector) => Array.from(root.querySelectorAll(selector)))
    .find((el) =>
      EMAIL.test(
        el.getAttribute("email") ??
          el.getAttribute("data-hovercard-id") ??
          el.getAttribute("title") ??
          el.getAttribute("aria-label") ??
          el.textContent ??
          "",
      ),
    );
  const senderSource =
    senderElement?.getAttribute("email") ??
    senderElement?.getAttribute("data-hovercard-id") ??
    senderElement?.getAttribute("title") ??
    senderElement?.getAttribute("aria-label") ??
    senderElement?.textContent ??
    text;
  const sender = senderSource.match(EMAIL)?.[0] ?? "";
  const senderName = (
    senderElement?.getAttribute("name") ??
    senderElement?.textContent?.replace(EMAIL, "").replace(/[<>]/g, "") ??
    ""
  ).trim();

  const subject =
    document
      .querySelector(
        provider === "Gmail"
          ? "h2.hP, h2[data-thread-perm-id], [role='main'] h2"
          : "[data-testid='message-subject'], [role='main'] h1, [role='main'] h2",
      )
      ?.textContent?.trim() ?? "";

  const ownHosts =
    /(^|\.)(mail\.google\.com|outlook\.(live|office|office365)\.com|outlook\.cloud\.microsoft)$/i;
  const links = Array.from(
    new Set(
      Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((a) => a.href)
        .filter((href) => {
          try {
            const url = new URL(href);
            return (
              /^https?:$/.test(url.protocol) && !ownHosts.test(url.hostname)
            );
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
