/**
 * Carga mineria-datos/data/mail_guard_dataset.csv en la tabla public.mineria_correos.
 *
 * Requiere la cadena de conexión de Postgres (Supabase → Connect → Session pooler) en
 * mineria-datos/.env (ignorado por git):
 *
 *   DATABASE_URL=postgresql://mineria.<ref>:<contraseña>@aws-0-<region>.pooler.supabase.com:5432/postgres
 *
 * Uso:  bun --env-file=mineria-datos/.env mineria-datos/cargar-supabase.ts
 *
 * Vacía la tabla antes de cargar, así que se puede repetir sin duplicar.
 */
import { SQL } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Falta DATABASE_URL. Créala en mineria-datos/.env (ver cabecera del script).",
  );
  process.exit(1);
}

const ENTEROS = new Set([
  "longitud_asunto",
  "longitud_cuerpo",
  "num_enlaces",
  "enlaces_acortados",
  "enlaces_con_ip",
  "palabras_urgencia",
  "antiguedad_dominio_dias",
  "hora_envio",
]);
const DECIMALES = new Set(["porcentaje_mayusculas"]);

const texto = readFileSync(
  join(import.meta.dir, "data", "mail_guard_dataset.csv"),
  "utf8",
).trimEnd();
const [cabecera, ...lineas] = texto.split("\n");
const columnas = cabecera!.split(",");

const filas = lineas.map((linea) => {
  const valores = linea.split(",");
  const fila: Record<string, string | number | null> = {};
  columnas.forEach((col, i) => {
    const v = valores[i] ?? "";
    if (ENTEROS.has(col) || DECIMALES.has(col)) {
      // En columnas numéricas, vacío y "NULL" son NULL real en Postgres.
      fila[col] =
        v === "" || v === "NULL"
          ? null
          : DECIMALES.has(col)
            ? Number.parseFloat(v)
            : Number.parseInt(v, 10);
    } else {
      // Texto: la celda vacía es un NULL real (RapidMiner la lee como faltante "?");
      // el texto literal 'NULL' se conserva como dato sucio que hay que declarar faltante.
      fila[col] = v === "" ? null : v;
    }
  });
  return fila;
});

const sql = new SQL({ url, tls: true, max: 4 });
const LOTE = 2_000; // 2.000 × 20 columnas = 40.000 parámetros (< 65.535)

console.log(`Cargando ${filas.length} filas en public.mineria_correos…`);
await sql`truncate public.mineria_correos`;
for (let i = 0; i < filas.length; i += LOTE) {
  const lote = filas.slice(i, i + LOTE);
  await sql`insert into public.mineria_correos ${sql(lote)}`;
  process.stdout.write(
    `\r  ${Math.min(i + LOTE, filas.length)} / ${filas.length}`,
  );
}
const [{ total }] =
  await sql`select count(*)::int as total from public.mineria_correos`;
console.log(`\nListo: ${total} filas en Supabase.`);
// Recalcula los histogramas y estadísticas que muestra el panel (migración 0005).
await sql`select public.mineria_refrescar_graficos()`;
console.log("Gráficas del panel actualizadas.");
await sql.close();
