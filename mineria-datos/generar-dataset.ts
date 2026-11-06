/**
 * Mail Guard · Generador del dataset sintético para minería de datos (RapidMiner).
 *
 * Objetivo de minería: predecir el VEREDICTO de un correo (seguro / sospechoso /
 * peligroso) a partir de características que Mail Guard extrae del mensaje.
 *
 * Composición (100.000 registros, requisito del profesor):
 *   - 80.000 limpios y válidos
 *   - 10.000 outliers (valores extremos en una o más variables numéricas)
 *   - 10.000 sucios: 4.000 con celdas vacías, 3.000 con "NULL", 3.000 duplicados exactos
 *
 * Uso:  bun mineria-datos/generar-dataset.ts
 * Salida: mineria-datos/data/mail_guard_dataset.csv  (para RapidMiner)
 *         mineria-datos/data/resumen_generacion.json  (conteos de control)
 *
 * La semilla es fija: siempre genera exactamente el mismo archivo.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TOTAL = 100_000;
const N_LIMPIOS = 80_000;
const N_OUTLIERS = 10_000;
const N_VACIOS = 4_000;
const N_NULL = 3_000;
const N_DUPLICADOS = 3_000;

// ── PRNG con semilla (mulberry32) ─────────────────────────────────────────
let seed = 20261103;
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const chance = (p: number) => rand() < p;
function normal(mean: number, sd: number): number {
  const u = 1 - rand();
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const poisson = (lambda: number) => {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
};

// ── Catálogos ─────────────────────────────────────────────────────────────
type Veredicto = "seguro" | "sospechoso" | "peligroso";

const DOMINIOS_LEGITIMOS = [
  "bancolombia.com.co",
  "davivienda.com",
  "dian.gov.co",
  "uts.edu.co",
  "nequi.com.co",
  "mercadolibre.com.co",
  "rappi.com",
  "netflix.com",
  "microsoft.com",
  "google.com",
  "amazon.com",
  "falabella.com.co",
  "claro.com.co",
  "movistar.co",
  "epm.com.co",
];
const DOMINIOS_GRATUITOS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
];
const DOMINIOS_FALSOS = [
  "bancolombia-seguridad.com",
  "dian-notificaciones.co",
  "nequi-soporte.net",
  "rnicrosoft.com",
  "netflix-pagos.info",
  "davivienda-alerta.xyz",
  "xn--bancolmbia-9db.com",
  "amaz0n-envios.top",
  "mercadolibre-ofertas.click",
  "secure-login-co.ru",
  "actualiza-datos.online",
  "paypa1-verify.com",
];

const COLUMNAS = [
  "id_correo",
  "fecha_analisis",
  "proveedor",
  "dominio_remitente",
  "tipo_dominio",
  "longitud_asunto",
  "longitud_cuerpo",
  "num_enlaces",
  "enlaces_acortados",
  "enlaces_con_ip",
  "dominio_imita_marca",
  "usa_punycode",
  "palabras_urgencia",
  "solicita_credenciales",
  "nombre_coincide_dominio",
  "tiene_adjunto",
  "antiguedad_dominio_dias",
  "hora_envio",
  "porcentaje_mayusculas",
  "veredicto",
] as const;
type Columna = (typeof COLUMNAS)[number];
type Fila = Record<Columna, string | number>;

const NUMERICAS: Columna[] = [
  "longitud_asunto",
  "longitud_cuerpo",
  "num_enlaces",
  "enlaces_acortados",
  "enlaces_con_ip",
  "palabras_urgencia",
  "antiguedad_dominio_dias",
  "porcentaje_mayusculas",
];
const RELLENABLES: Columna[] = COLUMNAS.filter(
  (c) => c !== "id_correo" && c !== "veredicto",
);

// ── Generación de un correo limpio ────────────────────────────────────────
const siNo = (p: number) => (chance(p) ? "si" : "no");

function fechaAleatoria(hora: number): string {
  const inicio = Date.UTC(2026, 0, 1);
  const dias = randInt(0, 303); // ene → oct 2026
  const d = new Date(inicio + dias * 86_400_000);
  d.setUTCHours(hora, randInt(0, 59), randInt(0, 59));
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function correoLimpio(n: number): Fila {
  // Prioridades realistas: la mayoría del correo es legítimo.
  const r = rand();
  const v: Veredicto =
    r < 0.6 ? "seguro" : r < 0.85 ? "sospechoso" : "peligroso";

  // Cada clase tiene su perfil, con solapamiento para que el modelo no sea trivial.
  const p = {
    seguro: {
      falso: 0.03,
      gratis: 0.2,
      enl: 2,
      acort: 0.05,
      ip: 0.005,
      imita: 0.02,
      puny: 0.003,
      urg: 0.4,
      cred: 0.04,
      coincide: 0.92,
      adj: 0.25,
      edad: [2500, 1200],
      may: [6, 3],
      nocturno: 0.08,
    },
    sospechoso: {
      falso: 0.45,
      gratis: 0.4,
      enl: 4,
      acort: 0.35,
      ip: 0.05,
      imita: 0.3,
      puny: 0.05,
      urg: 1.8,
      cred: 0.3,
      coincide: 0.55,
      adj: 0.3,
      edad: [400, 350],
      may: [14, 6],
      nocturno: 0.25,
    },
    peligroso: {
      falso: 0.85,
      gratis: 0.25,
      enl: 6,
      acort: 0.6,
      ip: 0.25,
      imita: 0.75,
      puny: 0.2,
      urg: 3.5,
      cred: 0.8,
      coincide: 0.2,
      adj: 0.4,
      edad: [60, 70],
      may: [24, 8],
      nocturno: 0.45,
    },
  }[v];

  const tipo = chance(p.falso)
    ? "desconocido"
    : chance(p.gratis)
      ? "gratuito"
      : "corporativo";
  const dominio =
    tipo === "desconocido"
      ? pick(DOMINIOS_FALSOS)
      : tipo === "gratuito"
        ? pick(DOMINIOS_GRATUITOS)
        : pick(DOMINIOS_LEGITIMOS);

  const numEnlaces = clamp(poisson(p.enl), 0, 25);
  const acortados = Array.from({ length: numEnlaces }, () =>
    chance(p.acort),
  ).filter(Boolean).length;
  const conIp = Array.from({ length: numEnlaces - acortados }, () =>
    chance(p.ip),
  ).filter(Boolean).length;
  const hora = chance(p.nocturno) ? randInt(0, 5) : randInt(6, 23);

  return {
    id_correo: `MG-${String(n).padStart(6, "0")}`,
    fecha_analisis: fechaAleatoria(hora),
    proveedor: chance(0.7) ? "gmail" : "outlook",
    dominio_remitente: dominio,
    tipo_dominio: tipo,
    longitud_asunto: Math.round(clamp(normal(48, 18), 3, 150)),
    longitud_cuerpo: Math.round(
      clamp(normal(v === "seguro" ? 1400 : 800, 500), 40, 5000),
    ),
    num_enlaces: numEnlaces,
    enlaces_acortados: acortados,
    enlaces_con_ip: conIp,
    dominio_imita_marca: siNo(p.imita),
    usa_punycode: siNo(p.puny),
    palabras_urgencia: clamp(poisson(p.urg), 0, 12),
    solicita_credenciales: siNo(p.cred),
    nombre_coincide_dominio: siNo(p.coincide),
    tiene_adjunto: siNo(p.adj),
    antiguedad_dominio_dias: Math.round(
      clamp(normal(p.edad[0]!, p.edad[1]!), 1, 9000),
    ),
    hora_envio: hora,
    porcentaje_mayusculas:
      Math.round(clamp(normal(p.may[0]!, p.may[1]!), 0, 60) * 10) / 10,
    veredicto: v,
  };
}

// ── Contaminación: outliers y datos sucios ────────────────────────────────
function volverOutlier(f: Fila): Fila {
  const extremos: Record<string, () => number> = {
    longitud_asunto: () => randInt(600, 4000),
    longitud_cuerpo: () => randInt(80_000, 900_000),
    num_enlaces: () => randInt(150, 2000),
    enlaces_acortados: () => randInt(100, 900),
    enlaces_con_ip: () => randInt(60, 500),
    palabras_urgencia: () => randInt(60, 400),
    antiguedad_dominio_dias: () =>
      chance(0.5) ? randInt(40_000, 99_999) : -randInt(1, 5000),
    porcentaje_mayusculas: () => randInt(250, 1000), // imposible (>100 %)
  };
  const cuantas = chance(0.7) ? 1 : 2;
  for (let i = 0; i < cuantas; i++) {
    const col = pick(NUMERICAS);
    f[col] = extremos[col]!();
  }
  return f;
}

function ensuciar(f: Fila, marcador: "" | "NULL"): Fila {
  const cuantas = chance(0.75) ? 1 : randInt(2, 3);
  for (let i = 0; i < cuantas; i++) f[pick(RELLENABLES)] = marcador;
  // Una parte de los sucios pierde también la etiqueta (no sirven para entrenar).
  if (chance(0.1)) f.veredicto = marcador;
  return f;
}

// ── Ensamblado ────────────────────────────────────────────────────────────
const filas: Fila[] = [];
let n = 1;
const limpios: Fila[] = [];
for (let i = 0; i < N_LIMPIOS; i++) limpios.push(correoLimpio(n++));
filas.push(...limpios);
for (let i = 0; i < N_OUTLIERS; i++)
  filas.push(volverOutlier(correoLimpio(n++)));
for (let i = 0; i < N_VACIOS; i++) filas.push(ensuciar(correoLimpio(n++), ""));
for (let i = 0; i < N_NULL; i++)
  filas.push(ensuciar(correoLimpio(n++), "NULL"));
for (let i = 0; i < N_DUPLICADOS; i++) filas.push({ ...pick(limpios) }); // copia exacta, mismo id

// Mezclar (Fisher–Yates) para que la suciedad no quede agrupada al final.
for (let i = filas.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [filas[i], filas[j]] = [filas[j]!, filas[i]!];
}
if (filas.length !== TOTAL)
  throw new Error(`Se esperaban ${TOTAL} filas y hay ${filas.length}`);

// ── Escritura ─────────────────────────────────────────────────────────────
const outDir = join(import.meta.dir, "data");
mkdirSync(outDir, { recursive: true });
const csv =
  [
    COLUMNAS.join(","),
    ...filas.map((f) => COLUMNAS.map((c) => f[c]).join(",")),
  ].join("\n") + "\n";
writeFileSync(join(outDir, "mail_guard_dataset.csv"), csv);

const conteoClases = filas.reduce<Record<string, number>>((acc, f) => {
  const k = f.veredicto === "" ? "(vacío)" : String(f.veredicto);
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
const resumen = {
  total: filas.length,
  limpios: N_LIMPIOS,
  outliers: N_OUTLIERS,
  sucios: {
    vacios: N_VACIOS,
    nulos_texto_NULL: N_NULL,
    duplicados_exactos: N_DUPLICADOS,
  },
  clases: conteoClases,
  semilla: 20261103,
};
writeFileSync(
  join(outDir, "resumen_generacion.json"),
  JSON.stringify(resumen, null, 2) + "\n",
);
console.log(resumen);
