/**
 * Conocimiento de dominio para las heurísticas. Son listas pequeñas y
 * explícitas a propósito: cada regla debe poder explicarse al usuario.
 */

/** Marcas frecuentemente suplantadas (énfasis en Colombia) y sus dominios oficiales. */
export const BRANDS: Record<string, { name: string; domains: string[] }> = {
  paypal: { name: "PayPal", domains: ["paypal.com"] },
  google: {
    name: "Google",
    domains: ["google.com", "gmail.com", "youtube.com"],
  },
  microsoft: {
    name: "Microsoft",
    domains: [
      "microsoft.com",
      "outlook.com",
      "live.com",
      "office.com",
      "hotmail.com",
    ],
  },
  apple: { name: "Apple", domains: ["apple.com", "icloud.com"] },
  amazon: {
    name: "Amazon",
    domains: ["amazon.com", "amazon.es", "amazonses.com"],
  },
  netflix: { name: "Netflix", domains: ["netflix.com"] },
  facebook: {
    name: "Facebook",
    domains: ["facebook.com", "facebookmail.com", "meta.com"],
  },
  instagram: {
    name: "Instagram",
    domains: ["instagram.com", "mail.instagram.com"],
  },
  whatsapp: { name: "WhatsApp", domains: ["whatsapp.com"] },
  bancolombia: {
    name: "Bancolombia",
    domains: ["bancolombia.com", "bancolombia.com.co"],
  },
  davivienda: { name: "Davivienda", domains: ["davivienda.com"] },
  nequi: { name: "Nequi", domains: ["nequi.com.co", "nequi.co"] },
  daviplata: { name: "DaviPlata", domains: ["daviplata.com"] },
  bbva: { name: "BBVA", domains: ["bbva.com", "bbva.com.co"] },
  dian: { name: "DIAN", domains: ["dian.gov.co"] },
  mercadolibre: {
    name: "Mercado Libre",
    domains: ["mercadolibre.com", "mercadolibre.com.co"],
  },
  dhl: { name: "DHL", domains: ["dhl.com"] },
  fedex: { name: "FedEx", domains: ["fedex.com"] },
  servientrega: { name: "Servientrega", domains: ["servientrega.com"] },
  binance: { name: "Binance", domains: ["binance.com"] },
  // Servicios digitales comunes (estudiantes y desarrolladores). Las claves
  // son nombres distintivos: una palabra genérica (render, notion, zoom…)
  // marcaría como imitación a cualquier dominio que la contenga.
  supabase: {
    name: "Supabase",
    domains: ["supabase.com", "supabase.io", "supabase.link", "supabase.co"],
  },
  github: {
    name: "GitHub",
    domains: ["github.com", "githubusercontent.com", "github.io"],
  },
  vercel: { name: "Vercel", domains: ["vercel.com", "vercel.app"] },
  netlify: { name: "Netlify", domains: ["netlify.com", "netlify.app"] },
  linkedin: { name: "LinkedIn", domains: ["linkedin.com", "lnkd.in"] },
  spotify: { name: "Spotify", domains: ["spotify.com"] },
  discord: { name: "Discord", domains: ["discord.com", "discord.gg"] },
  dropbox: { name: "Dropbox", domains: ["dropbox.com", "dropboxmail.com"] },
  docusign: {
    name: "DocuSign",
    domains: ["docusign.com", "docusign.net"],
  },
  airbnb: { name: "Airbnb", domains: ["airbnb.com", "airbnb.com.co"] },
  nubank: { name: "Nubank", domains: ["nubank.com.co", "nu.com.co"] },
  falabella: {
    name: "Falabella",
    domains: ["falabella.com", "falabella.com.co", "bancofalabella.com.co"],
  },
  rappi: { name: "Rappi", domains: ["rappi.com", "rappi.com.co"] },
};

export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "yahoo.es",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

export const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "t.ly",
  "s.id",
  "tiny.cc",
]);

export const RISKY_TLDS = new Set([
  "zip",
  "mov",
  "xyz",
  "top",
  "click",
  "country",
  "gq",
  "tk",
  "ml",
  "cf",
  "ga",
  "work",
  "support",
  "rest",
  "cam",
  "icu",
  "monster",
  "buzz",
]);

/** Palabras clave (sin tildes, minúsculas). */
export const KEYWORDS = {
  urgency: [
    "urgente",
    "inmediatamente",
    "de inmediato",
    "ultimo aviso",
    "ultima advertencia",
    "24 horas",
    "48 horas",
    "sera suspendid",
    "sera bloquead",
    "cuenta bloqueada",
    "cuenta suspendida",
    "expira hoy",
    "act now",
    "immediately",
    "urgent",
    "will be suspended",
    "final notice",
  ],
  credentials: [
    "contrasena",
    "clave",
    "password",
    "verifica tu cuenta",
    "verificar su cuenta",
    "confirma tu identidad",
    "confirm your account",
    "verify your account",
    "codigo de verificacion",
    "numero de tarjeta",
    "cvv",
    "datos bancarios",
    "inicia sesion aqui",
    "login here",
    "actualiza tus datos",
  ],
  money: [
    "transferencia",
    "pago pendiente",
    "factura vencida",
    "premio",
    "ganaste",
    "ganador",
    "reembolso",
    "bitcoin",
    "criptomoneda",
    "tarjeta de regalo",
    "gift card",
    "you won",
    "refund",
  ],
} as const;
