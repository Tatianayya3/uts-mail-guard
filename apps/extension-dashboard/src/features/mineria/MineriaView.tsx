"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Brain,
  Database,
  Filter,
  Grid3x3,
  Sparkles,
  TestTube2,
  Upload,
  Wand2,
} from "lucide-react";
import ChartCard from "@/features/dashboard/ChartCard";
import EmptyChartState from "@/features/dashboard/EmptyChartState";
import ErrorBanner from "@/features/dashboard/ErrorBanner";
import PageHeader from "@/features/dashboard/PageHeader";
import {
  BarrasHorizontales,
  Confianza,
  DispersionCrudos,
  DistribucionClases,
  Embudo,
  HistogramaClases,
  MatrizConfusion,
  MetricasPorClase,
  PerfilClases,
  TablaEstadisticas,
  etiquetaColumna,
  fmt,
} from "./MineriaGraficos";
import type { MineriaGraficos, MineriaResumen } from "./mineria.data";

const FLUJO = [
  { label: "Extracción", detail: "Read Database", icon: Database },
  { label: "Depuración", detail: "duplicados, nulos, outliers", icon: Filter },
  { label: "Transformación", detail: "etiqueta e ID", icon: Wand2 },
  { label: "Modelado", detail: "árbol · 80 / 20", icon: Brain },
  { label: "Carga", detail: "Write Database", icon: Upload },
  { label: "Visualización", detail: "este panel", icon: BarChart3 },
];

const SECCIONES = [
  { id: "datos", label: "Datos crudos" },
  { id: "depuracion", label: "Depuración" },
  { id: "exploracion", label: "Exploración" },
  { id: "modelo", label: "Modelo" },
];

const METRICA_LABEL: Record<string, string> = {
  accuracy: "Exactitud",
  kappa: "Kappa",
  classification_error: "Error de clasificación",
  weighted_mean_recall: "Recall ponderado",
  weighted_mean_precision: "Precisión ponderada",
};

const clave = (k: string) => k.toLowerCase().replace(/\s+/g, "_");

/** Busca una métrica de RapidMiner tolerando mayúsculas y espacios en el nombre. */
function metrica(metricas: Record<string, number>, nombre: string) {
  return Object.entries(metricas).find(([k]) => clave(k) === nombre)?.[1];
}
const pct = (v: number | undefined, dec = 1) =>
  v === undefined ? "—" : `${fmt(v <= 1 ? v * 100 : v, dec)} %`;

export default function MineriaView({
  data,
  error,
  graficos,
}: {
  data: MineriaResumen | null;
  error?: string;
  graficos?: MineriaGraficos | null;
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

  const faltantes = Object.entries(data.faltantes)
    .map(([columna, n]) => ({ nombre: etiquetaColumna(columna), n }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n);
  const outliers = Object.entries(data.outliers)
    .map(([columna, n]) => ({ nombre: etiquetaColumna(columna), n }))
    .sort((a, b) => b.n - a.n);
  const eliminados = embudo.crudos - embudo.limpios;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Minería de datos"
        description={
          <>
            Predicción del veredicto de un correo (seguro, sospechoso o
            peligroso) con RapidMiner sobre 100.000 registros sintéticos.
            {ejecutado && ` Última ejecución: ${ejecutado.replace(/\.$/, "")}.`}
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      <section
        aria-label="Resumen del proceso"
        className="mb-6 overflow-hidden rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60"
      >
        <div className="grid gap-px bg-guard-surface-raised lg:grid-cols-[1.1fr_2fr]">
          <div className="relative bg-guard-surface-card/80 p-6">
            <div
              className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-guard-accent/10 blur-3xl"
              aria-hidden="true"
            />
            <p className="text-xs font-medium tracking-wide text-guard-accent uppercase">
              Resultado del modelo
            </p>
            <p className="mt-2 text-5xl font-bold tracking-tight text-white tabular-nums">
              {hayModelo ? pct(exactitud) : "—"}
            </p>
            <p className="mt-1 text-sm text-guard-text-muted">
              {hayModelo
                ? "de exactitud del árbol de decisión sobre el 20 % de prueba"
                : "El modelo aún no se ha ejecutado en RapidMiner."}
            </p>
            {kappa !== undefined && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-guard-text-muted">
                Kappa{" "}
                <strong className="text-white tabular-nums">
                  {kappa.toFixed(3)}
                </strong>
                · acuerdo casi perfecto
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-px bg-guard-surface-raised sm:grid-cols-4">
            <Kpi
              icon={Database}
              label="Registros crudos"
              value={fmt(embudo.crudos)}
              helper="80 % limpios · 10 % outliers · 10 % sucios"
            />
            <Kpi
              icon={Filter}
              label="Eliminados"
              value={fmt(eliminados)}
              helper={`${fmt((eliminados / (embudo.crudos || 1)) * 100, 0)} % en la depuración`}
              tone="text-red-300"
            />
            <Kpi
              icon={Sparkles}
              label="Registros limpios"
              value={fmt(embudo.limpios)}
              helper="80 % entrenamiento"
              tone="text-guard-success"
            />
            <Kpi
              icon={TestTube2}
              label="Registros de prueba"
              value={fmt(data.prueba)}
              helper="20 % para validar"
            />
          </dl>
        </div>
        <ol
          aria-label="Flujo del proceso en RapidMiner"
          className="grid grid-cols-2 gap-px border-t border-guard-surface-raised bg-guard-surface-raised sm:grid-cols-3 lg:grid-cols-6"
        >
          {FLUJO.map((paso, i) => (
            <li
              key={paso.label}
              className="flex items-center gap-3 bg-guard-surface-card/80 px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-guard-accent/10 text-guard-accent">
                <paso.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-white">
                  <span className="text-guard-text-muted">{i + 1}.</span>{" "}
                  {paso.label}
                </span>
                <span className="block truncate text-[11px] text-guard-text-muted">
                  {paso.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Navegación por secciones ────────────────────────────────────── */}
      <nav
        aria-label="Secciones de la página"
        className="z-20 mb-8 lg:sticky lg:top-[61px]"
      >
        <ul className="flex flex-wrap gap-1 rounded-xl border border-guard-surface-raised bg-guard-surface/90 p-1 backdrop-blur-xl lg:inline-flex">
          {SECCIONES.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-guard-text-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-guard-accent"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[10px] text-guard-accent">
                  {i + 1}
                </span>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── 1. Datos crudos ─────────────────────────────────────────────── */}
      <Seccion
        id="datos"
        n={1}
        titulo="Datos crudos"
        descripcion="Lo que lee RapidMiner desde Supabase antes de limpiar: valores extremos, celdas vacías y textos «NULL»."
      >
        {graficos && (
          <ChartCard
            title="Dispersión y outliers"
            subtitle="Muestra sistemática de 1 de cada 50 filas, coloreada por proveedor. La franja lima es el rango válido: todo lo que queda fuera es un outlier."
          >
            <DispersionCrudos muestra={graficos.muestra} />
          </ChartCard>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Valores faltantes por columna"
            subtitle="Celdas vacías o con el texto «NULL»"
          >
            <BarrasHorizontales
              data={faltantes}
              ancho={180}
              serie="Faltantes"
              color="#f472b6"
            />
          </ChartCard>
          <ChartCard
            title="Outliers por variable"
            subtitle="Valores fuera del rango de negocio"
          >
            <BarrasHorizontales
              data={outliers}
              ancho={180}
              serie="Outliers"
              color="#ff8a5c"
            />
          </ChartCard>
        </div>
      </Seccion>

      {/* ── 2. Depuración ───────────────────────────────────────────────── */}
      <Seccion
        id="depuracion"
        n={2}
        titulo="Depuración"
        descripcion={`Tres filtros en cadena dejan ${fmt(embudo.limpios)} registros limpios. Las estadísticas muestran cuánto distorsionaban los datos sucios.`}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Embudo de limpieza"
            subtitle="Filas que sobreviven a cada fase"
          >
            <Embudo embudo={embudo} />
          </ChartCard>
          {graficos && (
            <ChartCard
              title="Estadísticas antes y después"
              subtitle="Como la pestaña Statistics de RapidMiner"
              className="lg:col-span-2"
            >
              <TablaEstadisticas estadisticas={graficos.estadisticas} />
            </ChartCard>
          )}
        </div>
      </Seccion>

      {/* ── 3. Exploración ──────────────────────────────────────────────── */}
      <Seccion
        id="exploracion"
        n={3}
        titulo="Exploración"
        descripcion="Cómo se reparte la etiqueta y qué variables separan un correo seguro de uno peligroso en el dataset limpio."
      >
        {graficos && (
          <ChartCard
            title="Histograma por clase"
            subtitle="Frecuencia de cada variable apilada por veredicto: donde los colores se separan, el modelo encuentra señal."
          >
            <HistogramaClases histogramas={graficos.histogramas} />
          </ChartCard>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Distribución de la etiqueta"
            subtitle="Veredicto a predecir, en total y por proveedor"
          >
            <DistribucionClases
              clases={data.clases}
              proveedores={graficos?.proveedores ?? []}
            />
          </ChartCard>
          <ChartCard
            title="Perfil de cada clase"
            subtitle="Promedios por veredicto: lo que aprende el árbol"
          >
            <PerfilClases perfil={data.perfil} />
          </ChartCard>
        </div>
      </Seccion>

      {/* ── 4. Modelo ───────────────────────────────────────────────────── */}
      <Seccion
        id="modelo"
        n={4}
        titulo="Modelo"
        descripcion="Árbol de decisión entrenado con el 80 % y validado con el 20 % restante (Performance (Classification))."
      >
        {hayModelo ? (
          <>
            {Object.keys(data.metricas).length > 0 && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(data.metricas).map(([criterio, valor]) => (
                  <div
                    key={criterio}
                    className="rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 px-4 py-3"
                  >
                    <dt className="text-xs text-guard-text-muted">
                      {METRICA_LABEL[clave(criterio)] ?? criterio}
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-white tabular-nums">
                      {clave(criterio) === "kappa"
                        ? valor.toFixed(3)
                        : pct(valor)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Matriz de confusión"
                subtitle="Filas: veredicto real · columnas: veredicto predicho"
              >
                <MatrizConfusion confusion={data.confusion} />
              </ChartCard>
              <ChartCard
                title="Precisión, recall y F1 por clase"
                subtitle="Calculadas de la matriz de confusión"
              >
                <MetricasPorClase confusion={data.confusion} />
              </ChartCard>
            </div>
            {graficos && graficos.confianza.length > 0 && (
              <ChartCard
                title="Confianza del modelo"
                subtitle="Predicciones por nivel de confianza: cuanto más seguro está el árbol, menos se equivoca."
              >
                <Confianza confianza={graficos.confianza} />
              </ChartCard>
            )}
          </>
        ) : (
          <ChartCard title="Sin predicciones todavía">
            <EmptyChartState
              icon={Grid3x3}
              title="El modelo aún no se ha ejecutado"
              description="Ejecuta el proceso completo en RapidMiner (pasos 5 y 6 de la guía)."
            />
          </ChartCard>
        )}
      </Seccion>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  helper,
  tone = "text-white",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: string;
}) {
  return (
    <div className="bg-guard-surface-card/80 p-5">
      <dt className="flex items-center gap-2 text-xs text-guard-text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className={`mt-2 text-2xl font-bold tabular-nums ${tone}`}>
        {value}
      </dd>
      <dd className="mt-1 text-[11px] text-guard-text-muted">{helper}</dd>
    </div>
  );
}

function Seccion({
  id,
  n,
  titulo,
  descripcion,
  children,
}: {
  id: string;
  n: number;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="mb-12 scroll-mt-32"
    >
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-guard-accent text-sm font-black text-guard-surface">
          {n}
        </span>
        <div>
          <h2 id={`${id}-titulo`} className="text-lg font-bold text-white">
            {titulo}
          </h2>
          <p className="text-sm text-guard-text-muted">{descripcion}</p>
        </div>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
