import { createHash } from "node:crypto";
import type { EmailSnapshot } from "@mail-guard/contracts";

/** Huella SHA-256 del correo normalizado: mismo correo → mismo análisis. */
export function computeEmailHash(email: EmailSnapshot): string {
  const fingerprint = [
    email.sender.trim().toLowerCase(),
    email.subject.trim(),
    email.bodyText.replace(/\s+/g, " ").trim(),
    [...email.links]
      .map((l) => l.trim().toLowerCase())
      .sort()
      .join("|"),
  ].join(":::");
  return createHash("sha256").update(fingerprint).digest("hex");
}
