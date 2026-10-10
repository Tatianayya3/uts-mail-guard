import { describe, expect, test } from "bun:test";
import {
  PROVIDER_LIST_TEXT,
  PROVIDERS,
  providerOf,
} from "../src/features/scan/model/providers";

describe("providerOf", () => {
  test.each([
    ["https://mail.google.com/mail/u/0/#inbox", "Gmail"],
    ["https://outlook.office.com/mail/inbox", "Outlook"],
    ["https://mail.yahoo.com/d/folders/1", "Yahoo"],
    ["https://es.mail.yahoo.com/d/folders/1", "Yahoo"],
    ["https://mail.aol.com/d/folders/1", "AOL"],
    ["https://mail.proton.me/u/0/inbox", "Proton"],
    ["https://mail.zoho.eu/zm/#mail/folder/inbox", "Zoho"],
  ])("%s → %s", (url, provider) => {
    expect(providerOf(url)).toBe(provider as keyof typeof PROVIDERS);
  });

  test("rechaza sitios que solo se parecen", () => {
    expect(providerOf("https://mail.google.com.evil.io/")).toBeNull();
    expect(providerOf("https://fakemail.yahoo.com.co/")).toBeNull();
    expect(providerOf("no es una url")).toBeNull();
    expect(providerOf(undefined)).toBeNull();
  });
});

describe("isEmailOpen: correo abierto vs. bandeja", () => {
  const cases: [keyof typeof PROVIDERS, string, string][] = [
    [
      "Gmail",
      "https://mail.google.com/mail/u/0/#inbox/FMfcgzQXJWDsKmbmTnhVbcNq",
      "https://mail.google.com/mail/u/0/#inbox",
    ],
    [
      "Outlook",
      "https://outlook.live.com/mail/0/inbox/id/AQMkADAwATYwMAItZ",
      "https://outlook.live.com/mail/0/inbox",
    ],
    [
      "Yahoo",
      "https://mail.yahoo.com/d/folders/1/messages/AKoWbzK8",
      "https://mail.yahoo.com/d/folders/1",
    ],
    [
      "AOL",
      "https://mail.aol.com/d/folders/1/messages/19234",
      "https://mail.aol.com/d/folders/1",
    ],
    [
      "Proton",
      "https://mail.proton.me/u/0/inbox/x8Pz3kQ_wL1vM2nB7cR4tY9u==",
      "https://mail.proton.me/u/0/inbox",
    ],
    [
      "Zoho",
      "https://mail.zoho.com/zm/#mail/folder/inbox/p/1700000000000100001",
      "https://mail.zoho.com/zm/#mail/folder/inbox",
    ],
  ];

  test.each(cases)("%s", (provider, open, inbox) => {
    expect(PROVIDERS[provider].isEmailOpen(new URL(open))).toBe(true);
    expect(PROVIDERS[provider].isEmailOpen(new URL(inbox))).toBe(false);
  });
});

test("texto con la lista de proveedores", () => {
  expect(PROVIDER_LIST_TEXT).toBe("Gmail, Outlook, Yahoo, AOL, Proton o Zoho");
});
