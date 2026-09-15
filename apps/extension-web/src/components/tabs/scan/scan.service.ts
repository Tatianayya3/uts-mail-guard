import type { MailProvider, ScanResult } from "./scan.types";
import { supabase } from "@/utils/supabase";
import { persistScan, queueAnonymousScan } from "./scan.storage";

type PageSnapshot = {
  hostname: string;
  sender: string;
  subject: string;
  bodyText: string;
  links: string[];
};

const supportedHosts = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
];

export async function getActiveMailProvider(): Promise<MailProvider> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return "Proveedor no compatible";
  const hostname = new URL(tab.url).hostname;
  if (hostname === "mail.google.com" || hostname.endsWith(".mail.google.com"))
    return "Gmail";
  if (hostname === "outlook.live.com" || hostname === "outlook.office.com")
    return "Outlook";
  return "Proveedor no compatible";
}

export async function scanActiveEmail(): Promise<ScanResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No hay una pestaña activa disponible.");
  }

  const hostname = new URL(tab.url).hostname;
  if (
    !supportedHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  ) {
    throw new Error("Abre un correo en Gmail u Outlook para escanearlo.");
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: readEmailSnapshot,
    args: [hostname.includes("google") ? "Gmail" : "Outlook"],
  });

  const snapshot = result as PageSnapshot | undefined;
  if (!snapshot?.sender) {
    throw new Error("No encontramos el remitente del correo abierto.");
  }

  const provider = hostname.includes("google") ? "Gmail" : "Outlook";
  const apiUrl = import.meta.env.VITE_SCAN_API_URL;
  if (!apiUrl) throw new Error("El servicio de análisis no está configurado.");

  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch(`${apiUrl}/api/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      email: {
        provider,
        sender: snapshot.sender,
        subject: snapshot.subject || "Correo abierto",
        bodyText: snapshot.bodyText,
        links: snapshot.links,
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "No se pudo analizar el correo.");
  }

  const scanResult = {
    ...payload,
    provider,
    subject: snapshot.subject || "Correo abierto",
  } as ScanResult;
  try {
    await persistScan(scanResult, sessionData.session?.access_token);
  } catch {
    queueAnonymousScan(scanResult);
  }
  return scanResult;
}

function readEmailSnapshot(provider: "Gmail" | "Outlook"): PageSnapshot {
  const root =
    provider === "Gmail"
      ? (document.querySelector("[role='main']") ?? document.body)
      : (document.querySelector(
          "[role='main'], [data-app-section='MailReadCompose']",
        ) ?? document.body);
  const text = (root as HTMLElement).innerText;
  const senderSelectors =
    provider === "Gmail"
      ? ["span[email]", ".gD[email]", "[data-hovercard-id*='@']"]
      : ["[email]", "[data-testid*='sender']", "[aria-label*='@']"];
  const senderFromElement = senderSelectors
    .flatMap((selector) => Array.from(root.querySelectorAll(selector)))
    .map(
      (element) =>
        element.getAttribute("email") ??
        element.getAttribute("data-hovercard-id") ??
        element.getAttribute("aria-label") ??
        element.textContent ??
        "",
    )
    .find((value) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value));
  const email =
    senderFromElement?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ??
    text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ??
    "";
  const subject =
    provider === "Gmail"
      ? (document
          .querySelector("h2.hP, h2[data-thread-perm-id], [role='main'] h2")
          ?.textContent?.trim() ?? "")
      : (document
          .querySelector(
            "[role='main'] h1, [role='main'] h2, [data-testid='message-subject']",
          )
          ?.textContent?.trim() ?? "");
  const links = Array.from(root.querySelectorAll("a[href]"))
    .map((link) => (link as HTMLAnchorElement).href)
    .filter(
      (href) =>
        /^https?:\/\//i.test(href) &&
        !/mail\.google\.com|outlook\.(live|office)\.com/i.test(href),
    )
    .filter((href, index, all) => all.indexOf(href) === index)
    .slice(0, 100);
  return {
    hostname: window.location.hostname,
    sender: email,
    subject,
    bodyText: text.replace(/\s+/g, " ").trim().slice(0, 20_000),
    links,
  };
}
