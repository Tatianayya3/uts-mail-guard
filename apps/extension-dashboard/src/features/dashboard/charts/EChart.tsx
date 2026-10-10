"use client";

import { useEffect, useRef, useState } from "react";
import type { ECharts } from "echarts/core";
import { cn } from "@mail-guard/ui";
import { THEME_NAME, type ChartOption } from "./theme";

type ChartEvent = {
  dataIndex?: number;
  seriesIndex?: number;
  name?: string;
  data?: unknown;
};

type EChartProps = {
  option: ChartOption;
  /** Descripción para lectores de pantalla. */
  ariaLabel: string;
  className?: string;
  onClick?: (event: ChartEvent) => void;
};

/**
 * Envoltorio mínimo de ECharts para React:
 * - carga la librería al montarse (import dinámico, sin SSR),
 * - se redimensiona con su contenedor (ResizeObserver),
 * - actualiza con setOption y anima los cambios entre filtros,
 * - respeta «reducir movimiento» y libera recursos al desmontarse.
 */
export default function EChart({
  option,
  ariaLabel,
  className,
  onClick,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const clickRef = useRef(onClick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;

    void import("./echarts").then(({ echarts }) => {
      const el = containerRef.current;
      if (disposed || !el) return;
      const chart = echarts.init(el, THEME_NAME, { renderer: "svg" });
      chart.on("click", (params) => clickRef.current?.(params as ChartEvent));
      chartRef.current = chart;
      observer = new ResizeObserver(() => chart.resize());
      observer.observe(el);
      setReady(true);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fontFamily = getComputedStyle(document.body).fontFamily;
    chart.setOption(
      {
        aria: { enabled: true, label: { description: ariaLabel } },
        textStyle: { fontFamily },
        ...(reduceMotion ? { animation: false } : {}),
        ...option,
      },
      // replaceMerge conserva la instancia: al filtrar, las series se animan
      // desde su estado anterior en vez de redibujarse desde cero.
      { replaceMerge: ["series", "dataZoom", "visualMap"], lazyUpdate: true },
    );
  }, [option, ariaLabel, ready]);

  return (
    <div
      className={cn("relative h-64 w-full", className)}
      role="img"
      aria-label={ariaLabel}
    >
      {!ready && (
        <div
          className="absolute inset-0 animate-pulse rounded-xl bg-white/[0.03]"
          aria-hidden="true"
        />
      )}
      <div
        ref={containerRef}
        className={cn("h-full w-full", ready && "animate-fade-in")}
      />
    </div>
  );
}
