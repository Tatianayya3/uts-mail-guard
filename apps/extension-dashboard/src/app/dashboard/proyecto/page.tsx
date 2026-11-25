import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CircleCheck,
  FlaskConical,
  GitBranch,
  Pickaxe,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/features/dashboard/PageHeader";
import ServiceStatus from "@/features/status/ServiceStatus";
import { REPO_URL } from "@/features/tests/tests.data";

export const metadata = { title: "Entregables | Mail Guard" };

const doc = (path: string) => `${REPO_URL}/blob/main/${path}`;

type Deliverable = {
  icon: LucideIcon;
  topic: string;
  title: string;
  text: string;
  href: string;
  external?: boolean;
  cta: string;
};

/** Cada tema de la materia, con dónde se ve en Mail Guard. */
const DELIVERABLES: Deliverable[] = [
  {
    icon: Bot,
    topic: "Agentes inteligentes · 30%",
    title: "Analista + Centinela",
    text: "Dos agentes conectados: uno reactivo basado en modelo (semiautomático) y uno deliberativo por objetivos (automático).",
    href: "/dashboard/agentes",
    cta: "Ver agentes en vivo",
  },
  {
    icon: Pickaxe,
    topic: "Minería de datos",
    title: "Proceso con RapidMiner",
    text: "Dataset, preparación, modelos y resultados sobre los análisis de phishing, con gráficas interactivas.",
    href: "/dashboard/mineria",
    cta: "Ver minería",
  },
  {
    icon: BrainCircuit,
    topic: "IA y machine learning",
    title: "Motor de decisión Jev",
    text: "Modelo de TypeSafe AI con probabilidades calibradas, combinado con reglas verificables (defensa en profundidad).",
    href: doc("docs/ARCHITECTURE.md"),
    external: true,
    cta: "Ver arquitectura",
  },
  {
    icon: FlaskConical,
    topic: "Microservicios y pruebas",
    title: "3 microservicios probados",
    text: "Pruebas unitarias, de API, seguridad y aceptación (Gherkin), más Postman contra producción.",
    href: "/dashboard/tests",
    cta: "Ver pruebas",
  },
  {
    icon: GitBranch,
    topic: "DevOps",
    title: "Las 8 fases",
    text: "CI en GitHub Actions, releases con tag, despliegue en Render y Vercel, monitoreo con Prometheus y Grafana.",
    href: doc("docs/DEVOPS.md"),
    external: true,
    cta: "Ver DevOps",
  },
];

/** Lo que pidió el profesor para el 30% de agentes, y dónde comprobarlo. */
const AGENT_CHECKLIST: { requirement: string; evidence: string }[] = [
  {
    requirement: "Agentes aplicados al proyecto de clase",
    evidence:
      "Analista (analysis-service) y Centinela (history-service), dentro de Mail Guard.",
  },
  {
    requirement: "Ejecutan una tarea específica",
    evidence:
      "Analista: dar un veredicto del correo. Centinela: detectar campañas y avisar a los expuestos.",
  },
  {
    requirement: "Un modo semiautomático",
    evidence:
      "El Analista actúa al pulsar «Escanear correo»; el Centinela, con «Ejecutar Centinela».",
  },
  {
    requirement: "Un modo automático",
    evidence:
      "El Centinela corre solo cada 30 min, al arrancar y cuando llegan análisis riesgosos (bitácora: «Automático» / «Por evento»).",
  },
  {
    requirement: "Clasificación vista en clase",
    evidence:
      "Analista: reactivo basado en modelo. Centinela: deliberativo basado en objetivos, con utilidad. Ver tablas PEAS.",
  },
  {
    requirement: "Agentes conectados (opcional, suma)",
    evidence:
      "El Centinela publica amenazas y el Analista las usa: un correo tranquilo de un dominio en campaña sale peligroso.",
  },
];

const DEMO_STEPS = [
  "Pulsa «Despertar servicios» un par de minutos antes y espera «Todo en línea».",
  "Abre Agentes IA y presenta los dos agentes: clasificación, modo y tabla PEAS.",
  "Con la extensión, escanea 2 o 3 correos de phishing del mismo dominio.",
  "Pulsa «Ejecutar Centinela» y muestra percepción, deliberación y acción del ciclo.",
  "Escanea un correo tranquilo de ese dominio: sale peligroso con «Reportado por el agente Centinela».",
];

export default function ProjectPage() {
  return (
    <>
      <PageHeader
        title="Entregables del proyecto"
        description="Todo lo de la materia en un solo lugar: qué tema cubre cada parte de Mail Guard y dónde verlo."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DELIVERABLES.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.title}
              href={d.href}
              target={d.external ? "_blank" : undefined}
              rel={d.external ? "noreferrer" : undefined}
              className="group flex flex-col rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5 transition-colors hover:border-guard-accent/30 focus-visible:outline-2 focus-visible:outline-guard-accent"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-guard-accent/10 text-guard-accent">
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-guard-text-muted">
                  {d.topic}
                </p>
              </div>
              <h2 className="mt-4 font-semibold text-white">{d.title}</h2>
              <p className="mt-1 flex-1 text-sm text-guard-text-muted">
                {d.text}
              </p>
              <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-guard-accent">
                {d.cta}
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5 md:p-6">
          <h2 className="font-semibold text-white">
            Entrega de agentes: lo que pidió el profesor
          </h2>
          <p className="mt-1 text-sm text-guard-text-muted">
            Cada requisito y dónde se comprueba en la app. Detalle completo en{" "}
            <a
              href={doc("docs/AGENTES.md")}
              target="_blank"
              rel="noreferrer"
              className="text-guard-accent hover:underline"
            >
              docs/AGENTES.md
            </a>
            .
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {AGENT_CHECKLIST.map((item) => (
              <li key={item.requirement} className="flex gap-3">
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-guard-success"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.requirement}
                  </p>
                  <p className="text-xs text-guard-text-muted">
                    {item.evidence}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5 md:p-6">
          <div>
            <h2 className="font-semibold text-white">Antes de la demo</h2>
            <p className="mt-1 text-sm text-guard-text-muted">
              Los servicios gratuitos se duermen tras 15 min sin uso.
            </p>
          </div>
          <ServiceStatus />
          <ol className="flex list-decimal flex-col gap-2 pl-4 text-xs text-guard-text-muted marker:font-semibold marker:text-guard-accent">
            {DEMO_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
