/**
 * Webmails compatibles. Sin imports a propósito: lo usan tanto el popup como
 * manifest.config.ts (host_permissions), que se evalúa en Node.
 */
export const PROVIDERS = {
  Gmail: {
    hosts: ["mail.google.com"],
    // #inbox/<id>, #label/x/<id>…: la lista de la bandeja no tiene id final.
    isEmailOpen: (url: URL) => {
      const segments = url.hash.replace(/^#/, "").split("/").filter(Boolean);
      return (
        segments.length >= 2 &&
        /^[A-Za-z0-9_-]{10,}$/.test(segments.at(-1) ?? "")
      );
    },
    selectors: {
      root: "[role='main']",
      sender: ["span.gD[email]", "span[email]", "[data-hovercard-id*='@']"],
      subject: "h2.hP, h2[data-thread-perm-id]",
    },
  },
  Outlook: {
    hosts: [
      "outlook.live.com",
      "outlook.office.com",
      "outlook.office365.com",
      "outlook.cloud.microsoft",
    ],
    isEmailOpen: (url: URL) => /\/id\//.test(url.pathname),
    selectors: {
      root: "[data-app-section='MailReadCompose'], [role='main']",
      sender: [
        "[data-testid*='sender'] [title*='@']",
        "[data-testid*='sender']",
      ],
      subject: "[data-testid='message-subject']",
    },
  },
  Yahoo: {
    hosts: ["mail.yahoo.com"],
    // …/d/folders/1/messages/<id>
    isEmailOpen: (url: URL) => /\/messages\/[^/]+/.test(url.pathname),
    selectors: {
      root: "[data-test-id='message-view'], [role='main']",
      sender: [
        "[data-test-id='message-from'] [title*='@']",
        "[data-test-id='message-from']",
      ],
      subject: "[data-test-id='message-group-subject-text']",
    },
  },
  AOL: {
    // AOL Mail usa la misma plataforma que Yahoo.
    hosts: ["mail.aol.com"],
    isEmailOpen: (url: URL) => /\/messages\/[^/]+/.test(url.pathname),
    selectors: {
      root: "[data-test-id='message-view'], [role='main']",
      sender: [
        "[data-test-id='message-from'] [title*='@']",
        "[data-test-id='message-from']",
      ],
      subject: "[data-test-id='message-group-subject-text']",
    },
  },
  Proton: {
    hosts: ["mail.proton.me", "mail.protonmail.com"],
    // /u/0/inbox/<id largo>
    isEmailOpen: (url: URL) => /\/[A-Za-z0-9_=-]{20,}\/?$/.test(url.pathname),
    selectors: {
      root: "[data-shortcut-target='message-container'], main",
      sender: [
        "[data-testid='recipients:sender'] [data-testid='recipient-address']",
        "[data-testid='recipient-address']",
      ],
      subject: "[data-testid='conversation-header:subject']",
    },
  },
  Zoho: {
    hosts: ["mail.zoho.com", "mail.zoho.eu", "mail.zoho.in"],
    // /zm/#mail/folder/inbox/p/<id>
    isEmailOpen: (url: URL) => /\/p\/\d+/.test(url.hash),
    selectors: {
      root: ".zmLMainContent, [role='main']",
      sender: [".zmMailFrom [title*='@']", ".zmMailFrom"],
      subject: ".zmMSubject, .SubjectLine",
    },
  },
} as const satisfies Record<string, ProviderConfig>;

export type ProviderSelectors = {
  root: string;
  sender: readonly string[];
  subject: string;
};

type ProviderConfig = {
  hosts: readonly string[];
  /** ¿La URL es la de un correo abierto (y no la bandeja)? */
  isEmailOpen: (url: URL) => boolean;
  selectors: ProviderSelectors;
};

export type SupportedProvider = keyof typeof PROVIDERS;

export const PROVIDER_NAMES = Object.keys(PROVIDERS) as SupportedProvider[];

export const ALL_PROVIDER_HOSTS: string[] = Object.values(PROVIDERS).flatMap(
  (p) => [...p.hosts],
);

/** «Gmail, Outlook, Yahoo, AOL, Proton o Zoho» */
export const PROVIDER_LIST_TEXT = `${PROVIDER_NAMES.slice(0, -1).join(", ")} o ${PROVIDER_NAMES.at(-1)}`;

export function providerOf(url: string | undefined): SupportedProvider | null {
  if (!url) return null;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  for (const name of PROVIDER_NAMES) {
    const hosts: readonly string[] = PROVIDERS[name].hosts;
    if (hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      return name;
    }
  }
  return null;
}
