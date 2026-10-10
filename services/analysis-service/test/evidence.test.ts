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

describe("más marcas y dominios", () => {
  test.each([
    ["bancolombiasegura.com", "Bancolombia"],
    ["mercado-libre-pagos.com", "Mercado Libre"],
    ["banco-de-bogota.co", "Banco de Bogotá"],
    ["avvi1las.com.co", "Banco AV Villas"],
    ["spotlfy-premium.xyz", "Spotify"],
    ["docusign-review.net", "DocuSign"],
    ["interrapidisimo-envios.co", "Inter Rapidísimo"],
  ])("%s imita a %s", (domain, brand) => {
    expect(imitatedBrand(domain)).toBe(brand);
  });

  test.each([
    "finance.yahoo.com",
    "lh3.googleusercontent.com",
    "bucket.s3.amazonaws.com",
    "www.spotify.com",
    "scotiabankcolpatria.com",
    "agua-claro.com",
  ])("%s no es suplantación", (domain) => {
    expect(imitatedBrand(domain)).toBeUndefined();
  });

  test("las siglas cortas del nombre visible deben ser palabra completa", () => {
    const guardian = collectEvidence({
      ...legitEmail,
      sender: "news@theguardian.com",
      senderName: "The Guardian",
    });
    expect(guardian.displayNameBrand).toBeUndefined();

    const dian = collectEvidence({
      ...legitEmail,
      sender: "notificaciones@dian-co.xyz",
      senderName: "Notificaciones DIAN",
    });
    expect(dian.displayNameBrand).toBe("DIAN");
  });

  test("nuevos proveedores de correo gratuito y acortadores", () => {
    const evidence = collectEvidence({
      ...legitEmail,
      sender: "soporte.banco@ymail.com",
      links: ["https://surl.li/abcd"],
    });
    expect(evidence.freeMail).toBe(true);
    expect(evidence.links[0]?.flags).toContain("shortener");
  });
});
