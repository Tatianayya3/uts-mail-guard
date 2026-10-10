import type { EChartsCoreOption } from "echarts/core";

export const THEME_NAME = "mail-guard";

/** Paleta del panel (hex reales: ECharts pinta fuera de Tailwind). */
export const COLORS = {
  accent: "#c8d400",
  accentBright: "#e4f132",
  safe: "#4edea3",
  suspicious: "#fbbf24",
  dangerous: "#ff5c5c",
  unknown: "#8f8f8f",
  text: "#f4f4ec",
  muted: "rgba(200,200,173,0.75)",
  axis: "rgba(200,200,173,0.55)",
  grid: "rgba(255,255,255,0.06)",
  surface: "#131313",
} as const;

export const MAIL_GUARD_THEME = {
  color: [
    COLORS.accent,
    COLORS.safe,
    COLORS.suspicious,
    COLORS.dangerous,
    COLORS.unknown,
  ],
  backgroundColor: "transparent",
  textStyle: { color: COLORS.muted },
  animationDuration: 700,
  animationEasing: "cubicOut",
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: COLORS.axis, fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: COLORS.axis, fontSize: 11 },
    splitLine: { lineStyle: { color: COLORS.grid } },
  },
};

/** Tooltip «cristal oscuro» común a todos los gráficos. */
export const tooltipBase = {
  backgroundColor: "rgba(19,19,19,0.92)",
  borderColor: "rgba(255,255,255,0.1)",
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: COLORS.text, fontSize: 12 },
  extraCssText:
    "border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);backdrop-filter:blur(8px);",
} as const;

export type ChartOption = EChartsCoreOption;

/** Marcador redondo de color para tooltips HTML. */
export const dot = (color: string) =>
  `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:6px"></span>`;

/** Escapa texto del usuario antes de meterlo en un tooltip HTML. */
export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
