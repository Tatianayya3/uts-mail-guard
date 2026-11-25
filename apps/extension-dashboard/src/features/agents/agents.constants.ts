import type {
  AgentTrigger,
  SentinelAction,
  SentinelDecision,
} from "@mail-guard/contracts";

export type AgentProfile = {
  id: "analyst" | "sentinel";
  name: string;
  role: string;
  classification: string;
  why: string;
  mode: string;
  /** Tabla PEAS: rendimiento, entorno, actuadores y sensores. */
  peas: { label: string; value: string }[];
};

/** Descripción formal de los dos agentes (lo que se sustenta en clase). */
export const AGENTS: AgentProfile[] = [
  {
    id: "analyst",
    name: "Agente Analista",
    role: "Analiza el correo abierto y entrega un veredicto explicable.",
    classification: "Reactivo basado en modelo",
    why: "Responde a lo que percibe con reglas condición → acción (dominio que imita a una marca → «falla»), y además mantiene un modelo interno del mundo: marcas oficiales, palabras clave, patrones de enlaces y las amenazas que publica el Centinela.",
    mode: "Semiautomático: actúa cuando el usuario pulsa «Escanear correo».",
    peas: [
      {
        label: "Rendimiento",
        value:
          "Veredictos correctos y explicables, en segundos, sin exponer datos.",
      },
      {
        label: "Entorno",
        value:
          "El correo abierto en Gmail u Outlook y la base de conocimiento del Centinela.",
      },
      {
        label: "Actuadores",
        value:
          "Veredicto, puntaje 0–100, señales, consejo e insignia en la pestaña.",
      },
      {
        label: "Sensores",
        value:
          "Remitente, asunto, texto y enlaces del correo (nunca adjuntos).",
      },
    ],
  },
  {
    id: "sentinel",
    name: "Agente Centinela",
    role: "Vigila los análisis de la comunidad y detecta campañas activas.",
    classification: "Deliberativo basado en objetivos (con utilidad)",
    why: "Tiene objetivos explícitos (detectar campañas, avisar a los expuestos, mantener vigente la base de conocimiento), creencias (amenazas conocidas) y delibera qué acción acerca cada objetivo. Prioriza con una función de utilidad cuando hay más trabajo del que cabe en un ciclo.",
    mode: "Automático: corre solo cada cierto tiempo y cuando llegan análisis riesgosos. También semiautomático con «Ejecutar Centinela».",
    peas: [
      {
        label: "Rendimiento",
        value:
          "Campañas detectadas pronto, cero falsos bloqueos de proveedores masivos, usuarios avisados.",
      },
      {
        label: "Entorno",
        value:
          "Análisis agregados de todos los usuarios (solo dominio y conteos).",
      },
      {
        label: "Actuadores",
        value:
          "Publicar, escalar o retirar amenazas y crear alertas para los usuarios expuestos.",
      },
      {
        label: "Sensores",
        value:
          "Reportes peligrosos, sospechosos y seguros por dominio en los últimos 30 días.",
      },
    ],
  },
];

export const TRIGGER_LABEL: Record<AgentTrigger, string> = {
  automatic: "Automático",
  event: "Por evento",
  manual: "Manual",
};

export const DECISION_LABEL: Record<SentinelDecision["decision"], string> = {
  flag: "Publicar",
  escalate: "Escalar",
  refresh: "Refrescar",
  retire: "Retirar",
  ignore: "Descartar",
};

export const ACTION_LABEL: Record<SentinelAction["type"], string> = {
  add_threat: "Amenaza publicada",
  update_threat: "Amenaza actualizada",
  retire_threat: "Amenaza retirada",
  alert_users: "Usuarios avisados",
};
