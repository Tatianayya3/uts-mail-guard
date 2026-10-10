/** Utilidades de dominios sin dependencias externas. */

const SECOND_LEVEL_SUFFIXES = new Set([
  "com",
  "co",
  "gov",
  "edu",
  "org",
  "net",
  "ac",
  "gob",
  "mil",
]);

/** "mail.paypal.com.co" → "paypal.com.co" (aproximación sin lista PSL). */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const tld = labels.at(-1)!;
  const second = labels.at(-2)!;
  const take = tld.length === 2 && SECOND_LEVEL_SUFFIXES.has(second) ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** Etiqueta principal del dominio: "paypal.com.co" → "paypal". */
export function domainLabel(domain: string): string {
  return registrableDomain(domain).split(".")[0] ?? domain;
}

export function domainOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

/** Normaliza trucos visuales típicos: p4ypa1 → paypal, rn → m, vv → w. */
export function deconfuse(value: string): string {
  return value
    .toLowerCase()
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[-_]/g, "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]!;
      row[j] = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length]!;
}

/** Quita tildes y pasa a minúsculas para comparar palabras clave. */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
