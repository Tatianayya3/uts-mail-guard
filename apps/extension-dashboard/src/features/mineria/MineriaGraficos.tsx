"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartTooltip from "@/features/dashboard/ChartTooltip";
import {
  ACCENT_HEX,
  AXIS_COLOR,
  GRID_COLOR,
  VERDICT_COLOR,
} from "@/features/dashboard/dashboard.constants";
import type {
  ClaseMineria,
  MineriaGraficos as Graficos,
  MineriaResumen,
} from "./mineria.data";

export const CLASES: ClaseMineria[] = ["seguro", "sospechoso", "peligroso"];
export const CLASE_COLOR: Record<ClaseMineria, string> = {
  seguro: VERDICT_COLOR.safe,
  sospechoso: VERDICT_COLOR.suspicious,
  peligroso: VERDICT_COLOR.dangerous,
};
export const CLASE_LABEL: Record<ClaseMineria, string> = {
  seguro: "Seguro",
  sospechoso: "Sospechoso",
  peligroso: "Peligroso",
};

const PROVEEDORES: { key: string; label: string; color: string }[] = [
  { key: "gmail", label: "gmail", color: "#60a5fa" },
  { key: "outlook", label: "outlook", color: "#a78bfa" },
  { key: "NULL", label: "texto «NULL»", color: "#f472b6" },
  { key: "vacío", label: "vacío (?)", color: "#9ca3af" },
];

/** Variables numéricas: etiqueta, ancho del histograma y rango válido de la depuración. */
const VARIABLES: Record<
  string,
  {
    label: string;
    ancho: number;
    min?: number;
    max?: number;
    columna?: number;
  }
> = {
  longitud_cuerpo: {
    label: "Longitud del cuerpo",
    ancho: 50,
    max: 5000,
    columna: 2,
  },
  longitud_asunto: {
    label: "Longitud del asunto",
    ancho: 5,
    max: 150,
    columna: 3,
  },
  num_enlaces: { label: "Número de enlaces", ancho: 1, max: 25, columna: 4 },
  enlaces_acortados: { label: "Enlaces acortados", ancho: 1, max: 25 },
  palabras_urgencia: {
    label: "Palabras de urgencia",
    ancho: 1,
    max: 12,
    columna: 5,
  },
  porcentaje_mayusculas: {
    label: "% de mayúsculas",
    ancho: 2,
    max: 100,
    columna: 7,
  },
  antiguedad_dominio_dias: {
    label: "Antigüedad del dominio (días)",
    ancho: 250,
    min: 1,
    max: 9000,
    columna: 6,
  },
  hora_envio: { label: "Hora de envío", ancho: 1 },
};
const VARIABLES_DISPERSION = Object.keys(VARIABLES).filter(
  (k) => VARIABLES[k]!.columna !== undefined,
);

/** Nombre legible de una columna del dataset. */
export const etiquetaColumna = (columna: string) =>
  VARIABLES[columna]?.label ??
  (columna.charAt(0).toUpperCase() + columna.slice(1)).replaceAll("_", " ");

export const fmt = (n: number, dec = 0) =>
  n.toLocaleString("es-CO", { maximumFractionDigits: dec });
const compacto = (n: number) =>
  Math.abs(n) >= 1000
    ? n.toLocaleString("es-CO", {
        notation: "compact",
        maximumFractionDigits: 1,
      })
    : fmt(n);

const CURSOR_BARRA = { fill: "rgba(255,255,255,0.04)" };
const TICK = { fontSize: 11 };

// ── Controles comunes ──────────────────────────────────────────────────────────

function SelectorVariable({
  value,
  onChange,
  opciones,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: string[];
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Variable
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-guard-surface-raised bg-guard-surface px-2.5 py-1.5 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-guard-accent"
      >
        {opciones.map((k) => (
          <option key={k} value={k}>
            {VARIABLES[k]!.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Segmentado<T extends string>({
  value,
  onChange,
  opciones,
  etiqueta,
}: {
  value: T;
  onChange: (v: T) => void;
  opciones: { value: T; label: string }[];
  etiqueta: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="inline-flex rounded-lg border border-guard-surface-raised bg-guard-surface p-0.5"
    >
      {opciones.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-guard-accent ${
            value === o.value
              ? "bg-guard-accent text-guard-surface"
              : "text-guard-text-muted hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Leyenda({
  items,
  className = "",
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul
      className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-guard-text-muted ${className}`}
    >
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: i.color }}
            aria-hidden="true"
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

const LEYENDA_CLASES = CLASES.map((c) => ({
  label: CLASE_LABEL[c],
  color: CLASE_COLOR[c],
}));

// ── Barras horizontales simples (faltantes, outliers) ─────────────────────────

type Barra = { nombre: string; n: number; color?: string };

export function BarrasHorizontales({
  data,
  ancho,
  serie,
  color = ACCENT_HEX,
}: {
  data: Barra[];
  ancho: number;
  serie: string;
  color?: string;
}) {
  return (
    <div
      className="w-full"
      style={{ height: Math.max(160, data.length * 26) }}
      role="img"
      aria-label={data.map((d) => `${d.nombre}: ${fmt(d.n)}`).join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
          barCategoryGap={5}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke={AXIS_COLOR}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={ancho}
          />
          <Tooltip cursor={CURSOR_BARRA} content={<ChartTooltip />} />
          <Bar
            dataKey="n"
            name={serie}
            fill={color}
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            isAnimationActive={false}
            background={{ fill: "rgba(255,255,255,0.03)", radius: 4 }}
          >
            {data.map((d) => (
              <Cell key={d.nombre} fill={d.color ?? color} />
            ))}
            <LabelList
              dataKey="n"
              position="right"
              formatter={(v) => fmt(Number(v))}
              className="fill-white text-[11px] font-semibold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Embudo de depuración ───────────────────────────────────────────────────────

export function Embudo({ embudo }: { embudo: MineriaResumen["embudo"] }) {
  const fases = [
    { fase: "Datos crudos", filas: embudo.crudos, motivo: "" },
    {
      fase: "Sin duplicados",
      filas: embudo.sin_duplicados,
      motivo: "duplicados exactos",
    },
    {
      fase: "Sin vacíos / nulos",
      filas: embudo.sin_faltantes,
      motivo: "celdas vacías o «NULL»",
    },
    {
      fase: "Sin outliers",
      filas: embudo.limpios,
      motivo: "fuera del rango de negocio",
    },
  ];
  const base = embudo.crudos || 1;

  return (
    <ol className="flex flex-col gap-3">
      {fases.map((f, i) => {
        const quitadas = i === 0 ? 0 : fases[i - 1]!.filas - f.filas;
        const ultima = i === fases.length - 1;
        return (
          <li key={f.fase}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-white">
                <span className="mr-1.5 text-guard-text-muted tabular-nums">
                  {i + 1}.
                </span>
                {f.fase}
              </span>
              <span className="font-semibold text-white tabular-nums">
                {fmt(f.filas)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(f.filas / base) * 100}%`,
                  backgroundColor: ultima ? ACCENT_HEX : "rgba(200,212,0,0.45)",
                }}
              />
            </div>
            {quitadas > 0 && (
              <p className="mt-1 text-[11px] text-guard-text-muted">
                <span className="font-semibold text-red-300 tabular-nums">
                  −{fmt(quitadas)}
                </span>{" "}
                {f.motivo}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Dispersión de los datos crudos (como "Read Database" en RapidMiner) ────────

export function DispersionCrudos({
  muestra,
}: {
  muestra: Graficos["muestra"];
}) {
  const [variable, setVariable] = useState("longitud_cuerpo");
  const [escala, setEscala] = useState<"lineal" | "log">("lineal");
  const def = VARIABLES[variable]!;

  const { series, fuera, sinValor } = useMemo(() => {
    const series = new Map<string, { x: number; y: number }[]>(
      PROVEEDORES.map((p) => [p.key, []]),
    );
    let fuera = 0;
    let sinValor = 0;
    muestra.forEach((punto, i) => {
      const y = punto[def.columna!] as number | null;
      if (y === null || y === undefined) {
        sinValor++;
        return;
      }
      if (
        (def.max !== undefined && y > def.max) ||
        (def.min !== undefined && y < def.min)
      )
        fuera++;
      const proveedor = series.has(punto[1]) ? punto[1] : "vacío";
      // En escala logarítmica los valores ≤ 0 se dibujan en 1.
      series
        .get(proveedor)!
        .push({ x: (i + 1) * 50, y: escala === "log" ? Math.max(y, 1) : y });
    });
    return { series, fuera, sinValor };
  }, [muestra, def, escala]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SelectorVariable
          id="var-dispersion"
          value={variable}
          onChange={setVariable}
          opciones={VARIABLES_DISPERSION}
        />
        <Segmentado
          etiqueta="Escala del eje vertical"
          value={escala}
          onChange={setEscala}
          opciones={[
            { value: "lineal", label: "Lineal" },
            { value: "log", label: "Logarítmica" },
          ]}
        />
      </div>
      <div
        className="h-80 w-full"
        role="img"
        aria-label={`Dispersión de ${def.label}: ${fuera} outliers en la muestra`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={GRID_COLOR} />
            <XAxis
              type="number"
              dataKey="x"
              name="Fila"
              domain={[0, "dataMax"]}
              stroke={AXIS_COLOR}
              tick={TICK}
              tickFormatter={compacto}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={def.label}
              stroke={AXIS_COLOR}
              tick={TICK}
              tickFormatter={compacto}
              width={52}
              scale={escala === "log" ? "log" : "auto"}
              domain={escala === "log" ? [1, "auto"] : [0, "auto"]}
              allowDataOverflow={escala === "log"}
            />
            <ReferenceArea
              y1={Math.max(def.min ?? 0, escala === "log" ? 1 : 0)}
              y2={def.max}
              fill={ACCENT_HEX}
              fillOpacity={0.1}
              ifOverflow="hidden"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: AXIS_COLOR }}
              content={<ChartTooltip />}
            />
            {PROVEEDORES.map((p) => (
              <Scatter
                key={p.key}
                name={p.label}
                data={series.get(p.key)}
                fill={p.color}
                fillOpacity={0.8}
                isAnimationActive={false}
                shape="circle"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Leyenda
          items={[
            ...PROVEEDORES,
            {
              label: `rango válido${def.max !== undefined ? ` (${def.min ? `${fmt(def.min)}–` : "≤ "}${fmt(def.max)})` : ""}`,
              color: "rgba(200,212,0,0.35)",
            },
          ]}
        />
        <p className="text-xs text-guard-text-muted">
          <strong className="text-red-300 tabular-nums">{fmt(fuera)}</strong>{" "}
          outliers
          {sinValor > 0 && (
            <>
              {" "}
              ·{" "}
              <strong className="text-white tabular-nums">
                {fmt(sinValor)}
              </strong>{" "}
              sin valor
            </>
          )}{" "}
          en {fmt(muestra.length)} filas
        </p>
      </div>
    </div>
  );
}

// ── Histograma por clase (como "Filtrar outliers" en RapidMiner) ───────────────

export function HistogramaClases({
  histogramas,
}: {
  histogramas: Graficos["histogramas"];
}) {
  const [variable, setVariable] = useState("longitud_cuerpo");
  const def = VARIABLES[variable]!;

  const datos = useMemo(() => {
    const bins = histogramas.filter((h) => h.variable === variable);
    if (bins.length === 0) return [];
    const porDesde = new Map(bins.map((b) => [b.desde, b]));
    const desde = Math.min(...bins.map((b) => b.desde));
    const hasta = Math.max(...bins.map((b) => b.desde));
    const salida = [];
    // Rellena los tramos vacíos para que el eje sea continuo.
    for (let x = desde; x <= hasta; x += def.ancho) {
      const b = porDesde.get(x);
      salida.push({
        tramo: def.ancho === 1 ? fmt(x) : `${fmt(x)} – ${fmt(x + def.ancho)}`,
        seguro: b?.seguro ?? 0,
        sospechoso: b?.sospechoso ?? 0,
        peligroso: b?.peligroso ?? 0,
      });
    }
    return salida;
  }, [histogramas, variable, def.ancho]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SelectorVariable
          id="var-histograma"
          value={variable}
          onChange={setVariable}
          opciones={Object.keys(VARIABLES)}
        />
        <Leyenda items={LEYENDA_CLASES} />
      </div>
      <div
        className="h-80 w-full"
        role="img"
        aria-label={`Histograma de ${def.label} por veredicto`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datos}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            barCategoryGap={datos.length > 40 ? 0 : 2}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="tramo"
              stroke={AXIS_COLOR}
              tick={TICK}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={(t: string) => t.split(" – ")[0]!}
            />
            <YAxis
              stroke={AXIS_COLOR}
              tick={TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={compacto}
              width={44}
            />
            <Tooltip cursor={CURSOR_BARRA} content={<ChartTooltip />} />
            {CLASES.map((c) => (
              <Bar
                key={c}
                dataKey={c}
                name={CLASE_LABEL[c]}
                stackId="clase"
                fill={CLASE_COLOR[c]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Distribución de la etiqueta (total y por proveedor) ───────────────────────

export function DistribucionClases({
  clases,
  proveedores,
}: {
  clases: MineriaResumen["clases"];
  proveedores: Graficos["proveedores"];
}) {
  const filas = [
    {
      nombre: "Total",
      ...Object.fromEntries(CLASES.map((c) => [c, clases[c] ?? 0])),
    } as { nombre: string } & Record<ClaseMineria, number>,
    ...proveedores.map((p) => ({ ...p, nombre: p.proveedor })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {filas.map((f, i) => {
        const total = CLASES.reduce((a, c) => a + f[c], 0) || 1;
        return (
          <div key={f.nombre}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span
                className={
                  i === 0 ? "font-semibold text-white" : "text-guard-text-muted"
                }
              >
                {f.nombre}
              </span>
              <span className="text-guard-text-muted tabular-nums">
                {fmt(total)} correos
              </span>
            </div>
            <div
              className={`flex overflow-hidden rounded-md ${i === 0 ? "h-7" : "h-5"}`}
              role="img"
              aria-label={`${f.nombre}: ${CLASES.map((c) => `${CLASE_LABEL[c]} ${fmt((f[c] / total) * 100, 1)} %`).join(", ")}`}
            >
              {CLASES.map((c) => {
                const p = (f[c] / total) * 100;
                return (
                  <div
                    key={c}
                    title={`${CLASE_LABEL[c]}: ${fmt(f[c])} (${fmt(p, 1)} %)`}
                    className="flex items-center justify-center text-[11px] font-semibold text-guard-surface tabular-nums"
                    style={{ width: `${p}%`, backgroundColor: CLASE_COLOR[c] }}
                  >
                    {p >= 8 && `${fmt(p, 1)} %`}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <Leyenda items={LEYENDA_CLASES} />
    </div>
  );
}

// ── Perfil de cada clase: mini barras por variable ─────────────────────────────

const PERFIL_COLUMNAS: { key: string; label: string; unidad?: string }[] = [
  { key: "dominio_imita_marca", label: "Imita una marca", unidad: "%" },
  { key: "solicita_credenciales", label: "Pide credenciales", unidad: "%" },
  { key: "enlaces_acortados", label: "Enlaces acortados" },
  { key: "palabras_urgencia", label: "Palabras de urgencia" },
  { key: "porcentaje_mayusculas", label: "Mayúsculas", unidad: "%" },
  { key: "antiguedad_dominio_dias", label: "Antigüedad del dominio (días)" },
];

export function PerfilClases({ perfil }: { perfil: MineriaResumen["perfil"] }) {
  const porClase = (c: ClaseMineria) => perfil.find((p) => p.veredicto === c);
  return (
    <div>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {PERFIL_COLUMNAS.map(({ key, label, unidad }) => {
          const valores = CLASES.map((c) => Number(porClase(c)?.[key] ?? 0));
          const max = Math.max(...valores) || 1;
          return (
            <div key={key}>
              <p className="mb-1.5 text-xs text-guard-text-muted">
                {label} <span className="text-[10px]">(promedio)</span>
              </p>
              <div className="flex flex-col gap-1">
                {CLASES.map((c, i) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(valores[i]! / max) * 100}%`,
                          backgroundColor: CLASE_COLOR[c],
                        }}
                        title={`${CLASE_LABEL[c]}: ${fmt(valores[i]!, 2)}`}
                      />
                    </div>
                    <span className="w-16 text-right text-[11px] font-semibold text-white tabular-nums">
                      {fmt(valores[i]!, 1)}
                      {unidad ? ` ${unidad}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Leyenda items={LEYENDA_CLASES} className="mt-4" />
    </div>
  );
}

// ── Estadísticas antes / después ───────────────────────────────────────────────

export function TablaEstadisticas({
  estadisticas,
}: {
  estadisticas: Graficos["estadisticas"];
}) {
  const filas = Object.keys(VARIABLES)
    .map((k) => ({
      k,
      crudos: estadisticas.find((e) => e.variable === k && e.fase === "crudos"),
      limpios: estadisticas.find(
        (e) => e.variable === k && e.fase === "limpios",
      ),
    }))
    .filter((f) => f.crudos && f.limpios);

  const columnas: {
    key: "media" | "mediana" | "maximo" | "desviacion";
    label: string;
  }[] = [
    { key: "media", label: "Media" },
    { key: "mediana", label: "Mediana" },
    { key: "maximo", label: "Máximo" },
    { key: "desviacion", label: "Desv. estándar" },
  ];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-xs">
          <thead>
            <tr className="text-guard-text-muted">
              <th className="p-2 text-left font-medium">Variable</th>
              {columnas.map((c) => (
                <th key={c.key} className="p-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ k, crudos, limpios }) => (
              <tr key={k} className="border-t border-white/5">
                <td className="p-2 text-white">{VARIABLES[k]!.label}</td>
                {columnas.map((c) => {
                  const antes = Number(crudos![c.key]);
                  const despues = Number(limpios![c.key]);
                  const cambio =
                    antes !== 0 &&
                    Math.abs(despues - antes) / Math.abs(antes) > 0.25;
                  return (
                    <td
                      key={c.key}
                      className="p-2 text-right whitespace-nowrap tabular-nums"
                    >
                      <span className="text-guard-text-muted line-through decoration-white/20">
                        {compacto(antes)}
                      </span>
                      <span className="px-1.5 text-guard-text-muted">→</span>
                      <span
                        className={`font-semibold ${cambio ? "text-guard-accent" : "text-white"}`}
                      >
                        {fmt(despues, 1)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-guard-text-muted">
        Cada celda: <span className="line-through">crudos</span> → limpios. En{" "}
        <span className="font-semibold text-guard-accent">lima</span>, los
        cambios de más del 25 %: los outliers inflaban la media, el máximo y la
        dispersión, mientras la mediana casi no se mueve.
      </p>
    </div>
  );
}

// ── Matriz de confusión ────────────────────────────────────────────────────────

export function MatrizConfusion({
  confusion,
}: {
  confusion: MineriaResumen["confusion"];
}) {
  const celda = (real: string, predicho: string) =>
    confusion.find((c) => c.real === real && c.predicho === predicho)?.n ?? 0;
  const totalFila = (real: string) =>
    CLASES.reduce((acc, p) => acc + celda(real, p), 0);
  const total = confusion.reduce((acc, c) => acc + c.n, 0);
  const aciertos = CLASES.reduce((acc, c) => acc + celda(c, c), 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left text-[10px] font-medium text-guard-text-muted">
                Real ↓ · Predicho →
              </th>
              {CLASES.map((p) => (
                <th key={p} className="p-1 font-medium text-guard-text-muted">
                  {CLASE_LABEL[p]}
                </th>
              ))}
              <th className="p-1 font-medium text-guard-text-muted">Recall</th>
            </tr>
          </thead>
          <tbody>
            {CLASES.map((r) => {
              const fila = totalFila(r);
              return (
                <tr key={r}>
                  <th className="p-1 text-left font-medium text-white">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: CLASE_COLOR[r] }}
                        aria-hidden="true"
                      />
                      {CLASE_LABEL[r]}
                    </span>
                  </th>
                  {CLASES.map((p) => {
                    const n = celda(r, p);
                    const share = fila ? n / fila : 0;
                    const diagonal = r === p;
                    return (
                      <td
                        key={p}
                        title={`Real ${CLASE_LABEL[r]}, predicho ${CLASE_LABEL[p]}: ${fmt(n)} (${(share * 100).toFixed(1)} % de la fila)`}
                        className="rounded-lg px-2 py-4 tabular-nums"
                        style={{
                          backgroundColor: diagonal
                            ? `rgba(200, 212, 0, ${0.15 + share * 0.6})`
                            : `rgba(255, 92, 92, ${n ? 0.08 + share * 1.5 : 0.03})`,
                        }}
                      >
                        <span
                          className={`block text-sm font-bold ${diagonal && share > 0.5 ? "text-guard-surface" : "text-white"}`}
                        >
                          {fmt(n)}
                        </span>
                        <span
                          className={`text-[10px] ${diagonal && share > 0.5 ? "text-guard-surface/70" : "text-guard-text-muted"}`}
                        >
                          {(share * 100).toFixed(1)} %
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-1 font-semibold text-white tabular-nums">
                    {fila
                      ? `${((celda(r, r) / fila) * 100).toFixed(1)} %`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-guard-text-muted">
        Diagonal (lima) = aciertos:{" "}
        <strong className="text-white">{fmt(aciertos)}</strong> de {fmt(total)}{" "}
        ({total ? ((aciertos / total) * 100).toFixed(1) : 0} %). Rojo =
        confusiones.
      </p>
    </div>
  );
}

// ── Métricas por clase ─────────────────────────────────────────────────────────

export function MetricasPorClase({
  confusion,
}: {
  confusion: MineriaResumen["confusion"];
}) {
  const celda = (real: string, pred: string) =>
    confusion.find((c) => c.real === real && c.predicho === pred)?.n ?? 0;
  const datos = CLASES.map((c) => {
    const tp = celda(c, c);
    const fila = CLASES.reduce((a, p) => a + celda(c, p), 0);
    const col = CLASES.reduce((a, r) => a + celda(r, c), 0);
    const precision = col ? tp / col : 0;
    const recall = fila ? tp / fila : 0;
    const f1 =
      precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return {
      clase: CLASE_LABEL[c],
      Precisión: +(precision * 100).toFixed(1),
      Recall: +(recall * 100).toFixed(1),
      F1: +(f1 * 100).toFixed(1),
    };
  });
  const series = [
    { key: "Precisión", color: ACCENT_HEX },
    { key: "Recall", color: "#60a5fa" },
    { key: "F1", color: "#a78bfa" },
  ];

  return (
    <div>
      <div
        className="h-64 w-full"
        role="img"
        aria-label={datos
          .map(
            (d) =>
              `${d.clase}: precisión ${d.Precisión} %, recall ${d.Recall} %, F1 ${d.F1} %`,
          )
          .join("; ")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datos}
            margin={{ top: 18, right: 4, left: 0, bottom: 0 }}
            barGap={3}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="clase"
              stroke={AXIS_COLOR}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke={AXIS_COLOR}
              tick={TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v} %`}
              width={44}
            />
            <Tooltip
              cursor={CURSOR_BARRA}
              content={<ChartTooltip unit=" %" />}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={s.key}
                  position="top"
                  formatter={(v) => fmt(Number(v), 0)}
                  className="fill-guard-text-muted text-[10px]"
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Leyenda
        className="mt-2 justify-center"
        items={series.map((s) => ({ label: s.key, color: s.color }))}
      />
    </div>
  );
}

// ── Confianza del modelo ───────────────────────────────────────────────────────

export function Confianza({ confianza }: { confianza: Graficos["confianza"] }) {
  const datos = confianza.map((c) => ({
    tramo: `${Math.round(c.desde * 100)}–${Math.round(c.desde * 100) + 5} %`,
    Aciertos: c.aciertos,
    Errores: c.errores,
  }));
  const alta = confianza.filter((c) => c.desde >= 0.9);
  const altaTotal = alta.reduce((a, c) => a + c.aciertos + c.errores, 0);
  const altaOk = alta.reduce((a, c) => a + c.aciertos, 0);
  const total = confianza.reduce((a, c) => a + c.aciertos + c.errores, 0);

  return (
    <div>
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Predicciones por tramo de confianza"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datos}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="tramo"
              stroke={AXIS_COLOR}
              tick={{ fontSize: 10 }}
              tickLine={false}
              tickFormatter={(t: string) => `${t.split("–")[0]!} %`}
            />
            <YAxis
              stroke={AXIS_COLOR}
              tick={TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={compacto}
              width={44}
            />
            <Tooltip cursor={CURSOR_BARRA} content={<ChartTooltip />} />
            <Bar
              dataKey="Aciertos"
              stackId="c"
              fill={VERDICT_COLOR.safe}
              isAnimationActive={false}
            />
            <Bar
              dataKey="Errores"
              stackId="c"
              fill={VERDICT_COLOR.dangerous}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Leyenda
          items={[
            { label: "Aciertos", color: VERDICT_COLOR.safe },
            { label: "Errores", color: VERDICT_COLOR.dangerous },
          ]}
        />
        {altaTotal > 0 && (
          <p className="text-xs text-guard-text-muted">
            Con confianza ≥ 90 % ({fmt((altaTotal / total) * 100, 0)} % de los
            casos) acierta el{" "}
            <strong className="text-white">
              {fmt((altaOk / altaTotal) * 100, 1)} %
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}
