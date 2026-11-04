"use client";

import {
  ArrowRight,
  Database,
  Grid3x3,
  Sparkles,
  Target,
  TestTube2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/features/dashboard/ChartCard";
import ChartTooltip from "@/features/dashboard/ChartTooltip";
import EmptyChartState from "@/features/dashboard/EmptyChartState";
import ErrorBanner from "@/features/dashboard/ErrorBanner";
import PageHeader from "@/features/dashboard/PageHeader";
import StatCard from "@/features/dashboard/StatCard";
import {
  ACCENT_HEX,
  AXIS_COLOR,
  GRID_COLOR,
  VERDICT_COLOR,
} from "@/features/dashboard/dashboard.constants";
import type { ClaseMineria, MineriaResumen } from "./mineria.data";

const CLASES: ClaseMineria[] = ["seguro", "sospechoso", "peligroso"];
const CLASE_COLOR: Record<ClaseMineria, string> = {
  seguro: VERDICT_COLOR.safe,
  sospechoso: VERDICT_COLOR.suspicious,
  peligroso: VERDICT_COLOR.dangerous,
};
const CLASE_LABEL: Record<ClaseMineria, string> = {
  seguro: "Seguro",
  sospechoso: "Sospechoso",
  peligroso: "Peligroso",
};

const FLUJO: { label: string; detail: string }[] = [
  { label: "Supabase", detail: "100.000 correos crudos" },
  { label: "Depuración", detail: "duplicados, nulos y outliers" },
  { label: "Split 80 / 20", detail: "estratificado" },
  { label: "Árbol de decisión", detail: "entrenamiento" },
  { label: "Apply Model", detail: "predicción sobre el 20 %" },
  { label: "Supabase → panel", detail: "métricas y predicciones" },
];

const fmt = (n: number) => n.toLocaleString("es-CO");
const etiqueta = (columna: string) => columna.replaceAll("_", " ");

/** Busca una métrica de RapidMiner tolerando mayúsculas y espacios en el nombre. */
function metrica(metricas: Record<string, number>, nombre: string) {
  const entrada = Object.entries(metricas).find(
    ([k]) => k.toLowerCase().replace(/\s+/g, "_") === nombre,
  );
  return entrada?.[1];
}
const pct = (v: number | undefined) =>
  v === undefined ? "—" : `${(v <= 1 ? v * 100 : v).toFixed(1)} %`;

export default function MineriaView({
  data,
  error,
}: {
  data: MineriaResumen | null;
  error?: string;
}) {
  if (!data) {
    return (
      <div className="max-w-6xl">
        <PageHeader title="Minería de datos" />
        <ErrorBanner message={error ?? "Sin datos."} />
      </div>
    );
  }

  const { embudo } = data;
  const exactitud = metrica(data.metricas, "accuracy");
  const kappa = metrica(data.metricas, "kappa");
  const hayModelo = data.prueba > 0;
  const ejecutado = data.ejecutado_en
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Bogota",
      }).format(new Date(data.ejecutado_en))
    : null;

  const fases = [
    { fase: "Datos crudos", filas: embudo.crudos, quitadas: 0 },
    {
      fase: "Sin duplicados",
      filas: embudo.sin_duplicados,
      quitadas: embudo.crudos - embudo.sin_duplicados,
    },
    {
      fase: "Sin vacíos / nulos",
      filas: embudo.sin_faltantes,
      quitadas: embudo.sin_duplicados - embudo.sin_faltantes,
    },
    {
      fase: "Sin outliers",
      filas: embudo.limpios,
      quitadas: embudo.sin_faltantes - embudo.limpios,
    },
  ];

  const faltantes = Object.entries(data.faltantes)
    .map(([columna, n]) => ({ columna: etiqueta(columna), n }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n);
  const outliers = Object.entries(data.outliers)
    .map(([columna, n]) => ({ columna: etiqueta(columna), n }))
    .sort((a, b) => b.n - a.n);
  const clases = CLASES.map((c) => ({
    clase: CLASE_LABEL[c],
    key: c,
    n: data.clases[c] ?? 0,
  }));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Minería de datos"
        description={
          <>
            Predicción del veredicto de un correo con RapidMiner sobre 100.000
            registros sintéticos.{" "}
            {ejecutado
              ? `Última ejecución del modelo: ${ejecutado}.`
              : "El modelo aún no se ha ejecutado."}
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="Registros crudos"
          value={fmt(embudo.crudos)}
          helper="80 % limpios · 10 % outliers · 10 % sucios"
        />
        <StatCard
          icon={Sparkles}
          label="Registros limpios"
          value={fmt(embudo.limpios)}
          helper={`${fmt(embudo.crudos - embudo.limpios)} eliminados en la depuración`}
          tone="success"
        />
        <StatCard
          icon={Target}
          label="Exactitud del modelo"
          value={pct(exactitud)}
          helper={
            kappa !== undefined
              ? `Kappa ${kappa.toFixed(3)}`
              : "Pendiente de ejecutar en RapidMiner"
          }
          tone="accent"
        />
        <StatCard
          icon={TestTube2}
          label="Registros de prueba"
          value={fmt(data.prueba)}
          helper="20 % reservado para validar"
        />
      </div>

      <Flujo />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Embudo de depuración"
          subtitle="Filas que sobreviven a cada fase de limpieza"
        >
          <BarrasHorizontales
            data={fases.map((f) => ({
              nombre: f.fase,
              n: f.filas,
              nota: f.quitadas ? `−${fmt(f.quitadas)}` : "",
            }))}
            ancho={130}
            serie="Filas"
          />
        </ChartCard>

        <ChartCard
          title="Distribución de la etiqueta"
          subtitle="Veredicto en el dataset limpio (clase a predecir)"
        >
          <BarrasHorizontales
            data={clases.map((c) => ({
              nombre: c.clase,
              n: c.n,
              color: CLASE_COLOR[c.key],
              nota: embudo.limpios
                ? `${((c.n / embudo.limpios) * 100).toFixed(1)} %`
                : "",
            }))}
            ancho={90}
            serie="Correos"
          />
        </ChartCard>

        <ChartCard
          title="Valores faltantes por columna"
          subtitle="Celdas vacías o con el texto «NULL» en los datos crudos"
        >
          <BarrasHorizontales
            data={faltantes.map((f) => ({ nombre: f.columna, n: f.n }))}
            ancho={170}
            serie="Faltantes"
            alto={Math.max(220, faltantes.length * 24)}
          />
        </ChartCard>

        <ChartCard
          title="Outliers por variable"
          subtitle="Valores fuera del rango de negocio en los datos crudos"
        >
          <BarrasHorizontales
            data={outliers.map((o) => ({ nombre: o.columna, n: o.n }))}
            ancho={170}
            serie="Outliers"
          />
        </ChartCard>
      </div>

      <div className="mb-10 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Matriz de confusión"
          subtitle="Filas: veredicto real · columnas: veredicto predicho (20 % de prueba)"
        >
          {hayModelo ? (
            <MatrizConfusion confusion={data.confusion} />
          ) : (
            <EmptyChartState
              icon={Grid3x3}
              title="Sin predicciones todavía"
              description="Ejecuta el proceso completo en RapidMiner (pasos 5 y 6 de la guía)."
            />
          )}
        </ChartCard>

        <ChartCard
          title="Perfil de cada clase"
          subtitle="Promedios en el dataset limpio: lo que aprende el modelo"
        >
          <PerfilClases perfil={data.perfil} />
        </ChartCard>
      </div>

      {hayModelo && Object.keys(data.metricas).length > 0 && (
        <ChartCard
          title="Métricas de RapidMiner"
          subtitle="Salida de Performance (Classification) sobre el 20 % de prueba"
          className="mb-10"
        >
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(data.metricas).map(([criterio, valor]) => (
              <div key={criterio} className="rounded-xl bg-white/5 px-4 py-3">
                <dt className="text-xs text-guard-text-muted">
                  {etiqueta(criterio)}
                </dt>
                <dd className="mt-1 text-xl font-semibold text-white tabular-nums">
                  {criterio.toLowerCase() === "kappa"
                    ? valor.toFixed(3)
                    : pct(valor)}
                </dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      )}
    </div>
  );
}

function Flujo() {
  return (
    <section
      aria-label="Flujo del proceso de minería"
      className="mb-6 rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5"
    >
      <h3 className="mb-4 text-sm font-semibold text-white">
        Flujo del proceso en RapidMiner
      </h3>
      <ol className="flex flex-wrap items-center gap-2">
        {FLUJO.map((paso, i) => (
          <li key={paso.label} className="flex items-center gap-2">
            <div className="rounded-xl border border-guard-accent/20 bg-guard-accent/5 px-3 py-2">
              <p className="text-xs font-semibold text-guard-accent">
                {i + 1}. {paso.label}
              </p>
              <p className="text-[11px] text-guard-text-muted">{paso.detail}</p>
            </div>
            {i < FLUJO.length - 1 && (
              <ArrowRight
                className="h-4 w-4 shrink-0 text-guard-text-muted"
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

type Barra = { nombre: string; n: number; color?: string; nota?: string };

function BarrasHorizontales({
  data,
  ancho,
  serie,
  alto = 220,
}: {
  data: Barra[];
  ancho: number;
  serie: string;
  alto?: number;
}) {
  return (
    <div
      className="w-full"
      style={{ height: alto }}
      role="img"
      aria-label={data.map((d) => `${d.nombre}: ${fmt(d.n)}`).join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 64, left: 0, bottom: 0 }}
          barCategoryGap={4}
        >
          <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
          <XAxis
            type="number"
            stroke={AXIS_COLOR}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmt(v)}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke={AXIS_COLOR}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={ancho}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="n"
            name={serie}
            fill={ACCENT_HEX}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
          >
            {data.map((d) => (
              <Cell key={d.nombre} fill={d.color ?? ACCENT_HEX} />
            ))}
            <LabelList
              dataKey={(d: Barra) => d.nota || fmt(d.n)}
              position="right"
              className="fill-guard-text-muted text-[11px]"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MatrizConfusion({
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
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-center text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-guard-text-muted">
              Real ↓ / Predicho →
            </th>
            {CLASES.map((p) => (
              <th key={p} className="p-2 font-medium text-guard-text-muted">
                {CLASE_LABEL[p]}
              </th>
            ))}
            <th className="p-2 font-medium text-guard-text-muted">Recall</th>
          </tr>
        </thead>
        <tbody>
          {CLASES.map((r) => {
            const fila = totalFila(r);
            return (
              <tr key={r}>
                <th className="p-2 text-left font-medium text-white">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CLASE_COLOR[r] }}
                      aria-hidden="true"
                    />
                    {CLASE_LABEL[r]}
                  </span>
                </th>
                {CLASES.map((p) => {
                  const n = celda(r, p);
                  const share = fila ? n / fila : 0;
                  return (
                    <td
                      key={p}
                      title={`Real ${CLASE_LABEL[r]}, predicho ${CLASE_LABEL[p]}: ${fmt(n)} (${(share * 100).toFixed(1)} % de la fila)`}
                      className="rounded-md p-3 font-semibold text-white tabular-nums"
                      style={{
                        backgroundColor: `rgba(200, 212, 0, ${0.06 + share * 0.5})`,
                        outline:
                          r === p ? "1px solid rgba(200,212,0,0.6)" : undefined,
                      }}
                    >
                      {fmt(n)}
                    </td>
                  );
                })}
                <td className="p-2 text-guard-text-muted tabular-nums">
                  {fila ? `${((celda(r, r) / fila) * 100).toFixed(1)} %` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-guard-text-muted">
        Diagonal = aciertos: {fmt(aciertos)} de {fmt(total)} (
        {total ? ((aciertos / total) * 100).toFixed(1) : 0} %).
      </p>
    </div>
  );
}

const PERFIL_COLUMNAS: { key: string; label: string; unidad?: string }[] = [
  { key: "dominio_imita_marca", label: "Imita una marca", unidad: "%" },
  { key: "solicita_credenciales", label: "Pide credenciales", unidad: "%" },
  { key: "enlaces_acortados", label: "Enlaces acortados" },
  { key: "palabras_urgencia", label: "Palabras de urgencia" },
  { key: "porcentaje_mayusculas", label: "Mayúsculas", unidad: "%" },
  { key: "antiguedad_dominio_dias", label: "Antigüedad del dominio (días)" },
];

function PerfilClases({ perfil }: { perfil: MineriaResumen["perfil"] }) {
  const porClase = (c: ClaseMineria) => perfil.find((p) => p.veredicto === c);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-guard-text-muted">
            <th className="p-2 text-left font-medium">Variable (promedio)</th>
            {CLASES.map((c) => (
              <th key={c} className="p-2 text-right font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CLASE_COLOR[c] }}
                    aria-hidden="true"
                  />
                  {CLASE_LABEL[c]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERFIL_COLUMNAS.map(({ key, label, unidad }) => (
            <tr key={key} className="border-t border-white/5">
              <td className="p-2 text-guard-text-muted">{label}</td>
              {CLASES.map((c) => {
                const v = porClase(c)?.[key];
                return (
                  <td
                    key={c}
                    className="p-2 text-right font-semibold text-white tabular-nums"
                  >
                    {v === undefined
                      ? "—"
                      : `${fmt(Number(v))}${unidad ? ` ${unidad}` : ""}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
