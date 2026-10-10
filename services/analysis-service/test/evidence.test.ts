import { describe, expect, test } from "bun:test";
import {
  collectEvidence,
  imitatedBrand,
  inspectLink,
} from "../src/domain/evidence";
import { registrableDomain } from "../src/domain/domains";
import { emptyEmail, legitEmail, phishingEmail } from "./fixtures";

describe("domains", () => {
  test("registrableDomain maneja sufijos de segundo nivel", () => {
    expect(registrableDomain("mail.bancolombia.com.co")).toBe(
      "bancolombia.com.co",
    );
    expect(registrableDomain("accounts.google.com")).toBe("google.com");
  });
});

describe("imitatedBrand", () => {
  test("detecta dominios parecidos a marcas", () => {
    expect(imitatedBrand("bancolombla-alertas.com")).toBe("Bancolombia");
    expect(imitatedBrand("paypa1-secure.com")).toBe("PayPal");
    expect(imitatedBrand("secure.paypal.login-verify.xyz")).toBe("PayPal");
  });

  test("no marca dominios oficiales ni falsos positivos comunes", () => {
    expect(imitatedBrand("paypal.com")).toBeUndefined();
    expect(imitatedBrand("accounts.google.com")).toBeUndefined();
    expect(imitatedBrand("applebees.com")).toBeUndefined();
    expect(imitatedBrand("apply.com")).toBeUndefined();
  });
});

describe("inspectLink", () => {
  test("una IP como destino es peligrosa", () => {
    expect(inspectLink("http://192.168.10.20/login", "x.com").risk).toBe(
      "dangerous",
    );
  });
  test("un acortador es sospechoso", () => {
    const link = inspectLink("https://bit.ly/abc", "x.com");
    expect(link.risk).toBe("suspicious");
    expect(link.flags).toContain("shortener");
  });
  test("un enlace limpio es seguro", () => {
    expect(inspectLink("https://uts.edu.co/noticias", "uts.edu.co").risk).toBe(
      "safe",
    );
  });
});

describe("collectEvidence", () => {
  test("phishing reúne suplantación, urgencia y datos sensibles", () => {
    const e = collectEvidence(phishingEmail);
    expect(e.lookalikeBrand).toBe("Bancolombia");
    expect(e.urgency.length).toBeGreaterThan(0);
    expect(e.credentials).toContain("contrasena");
    expect(e.links.map((l) => l.risk)).toEqual(["dangerous", "suspicious"]);
  });

  test("correo legítimo de Google no levanta alertas", () => {
    const e = collectEvidence(legitEmail);
    expect(e.officialBrand).toBe("Google");
    expect(e.lookalikeBrand).toBeUndefined();
    expect(e.displayNameBrand).toBeUndefined();
  });

  test("correo vacío no tiene contenido analizable", () => {
    expect(collectEvidence(emptyEmail).hasContent).toBe(false);
  });
});
