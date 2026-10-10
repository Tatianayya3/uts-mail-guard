/**
 * Copia cada `.env.example` a `.env` (o `.env.local` en Next.js) si aún no
 * existe. Con los valores por defecto todo arranca en local sin claves:
 * motor heurístico, cuota en memoria y modo invitado.
 */
import { existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const targets: [dir: string, file: string][] = [
  ["services/gateway", ".env"],
  ["services/analysis-service", ".env"],
  ["services/history-service", ".env"],
  ["apps/extension-web", ".env"],
  ["apps/extension-dashboard", ".env.local"],
];

for (const [dir, file] of targets) {
  const source = join(dir, ".env.example");
  const target = join(dir, file);
  if (existsSync(target)) {
    console.log(`• ${target} ya existe, no se toca`);
  } else {
    copyFileSync(source, target);
    console.log(`✓ ${target} creado desde .env.example`);
  }
}
console.log(
  "\nListo. Completa las claves de Supabase y (opcional) TYPESAFE_API_KEY, luego: bun run dev",
);
