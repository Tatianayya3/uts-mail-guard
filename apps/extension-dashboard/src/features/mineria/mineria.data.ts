import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ClaseMineria = "seguro" | "sospechoso" | "peligroso";

export type MineriaResumen = {
  /** Filas que sobreviven a cada fase de limpieza del proceso de RapidMiner. */
  embudo: {
    crudos: number;
    sin_duplicados: number;
    sin_faltantes: number;
    limpios: number;
  };
  /** Faltantes por columna en los datos crudos (NULL real o texto "NULL"). */
  faltantes: Record<string, number>;
  /** Valores fuera del rango de negocio, por variable, en los datos crudos. */
  outliers: Record<string, number>;
  /** Distribución de la etiqueta en el dataset limpio. */
  clases: Partial<Record<ClaseMineria, number>>;
  /** Promedios por clase en el dataset limpio. */
  perfil: ({ veredicto: ClaseMineria } & Record<string, number>)[];
  /** Salida de Performance to Data en RapidMiner (criterio → valor). */
  metricas: Record<string, number>;
  /** Matriz de confusión sobre el 20 % de prueba. */
  confusion: { real: string; predicho: string; n: number }[];
  /** Filas de prueba con predicción guardada. */
  prueba: number;
  ejecutado_en: string | null;
};

/** Resumen de la minería calculado en Postgres (RPC mineria_resumen). */
export async function loadMineria(): Promise<{
  data: MineriaResumen | null;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("mineria_resumen");
  if (error) {
    return {
      data: null,
      error: "No pudimos cargar los resultados de la minería de datos.",
    };
  }
  return { data: data as MineriaResumen };
}

export type HistogramaBin = {
  variable: string;
  desde: number;
} & Record<ClaseMineria, number>;

export type EstadisticaVariable = {
  variable: string;
  fase: "crudos" | "limpios";
  n: number;
  minimo: number;
  maximo: number;
  media: number;
  mediana: number;
  desviacion: number;
};

/**
 * Muestra compacta de los crudos (1 de cada 50 filas):
 * [fila, proveedor, cuerpo, asunto, enlaces, urgencia, antigüedad, mayúsculas].
 */
export type PuntoMuestra = [number, string, ...(number | null)[]];

export type MineriaGraficos = {
  histogramas: HistogramaBin[];
  muestra: PuntoMuestra[];
  estadisticas: EstadisticaVariable[];
  proveedores: ({ proveedor: string } & Record<ClaseMineria, number>)[];
  /** Confianza del modelo en el 20 % de prueba, en tramos de 5 puntos. */
  confianza: { desde: number; aciertos: number; errores: number }[];
};

/** Datos de las gráficas detalladas (RPC mineria_graficos, migración 0005). */
export async function loadMineriaGraficos(): Promise<MineriaGraficos | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("mineria_graficos");
  if (error || !data) return null;
  return data as MineriaGraficos;
}
