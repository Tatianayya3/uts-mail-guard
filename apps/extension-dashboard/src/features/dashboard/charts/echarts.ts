/**
 * Registro modular de Apache ECharts: solo se empaquetan los gráficos y
 * componentes que usa el panel (tree-shaking). Este módulo se importa de forma
 * diferida desde <EChart>, así la librería no bloquea la primera pintura.
 */
import { BarChart, HeatmapChart, LineChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  PolarComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { SVGRenderer } from "echarts/renderers";
import { MAIL_GUARD_THEME, THEME_NAME } from "./theme";

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  PolarComponent,
  TooltipComponent,
  VisualMapComponent,
  LabelLayout,
  UniversalTransition,
  // SVG: nítido en cualquier zoom y más liviano para gráficos pequeños.
  SVGRenderer,
]);

echarts.registerTheme(THEME_NAME, MAIL_GUARD_THEME);

export { echarts };
