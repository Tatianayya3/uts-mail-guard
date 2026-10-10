import {
  AtSign,
  FileText,
  Link2,
  MailCheck,
  MousePointerClick,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { VERDICT_ORDER } from "@mail-guard/contracts";
import { VerdictBadge } from "@mail-guard/ui";
import PageHeader from "@/features/dashboard/PageHeader";

export const metadata = { title: "Guía | Mail Guard" };

const VERDICT_HELP = {
  safe: "Puntaje de 70 o más. Sin señales de phishing; igual verifica antes de compartir datos.",
  suspicious:
    "Entre 40 y 69. Hay señales que conviene confirmar por otro canal antes de actuar.",
  dangerous:
    "Menos de 40. Señales claras de fraude: no abras enlaces ni respondas.",
  unknown:
    "No hubo evidencia suficiente (por ejemplo, un correo sin texto ni enlaces).",
} as const;

const SIGNALS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: AtSign,
    title: "Remitente",
    text: "¿El dominio imita a una marca (bancolombla.com, paypa1.com)? ¿El nombre visible dice «Bancolombia» pero el correo viene de otro dominio?",
  },
  {
    icon: FileText,
    title: "Contenido",
    text: "Urgencia («tu cuenta será bloqueada en 24 horas»), premios o solicitudes de contraseñas, códigos o datos bancarios.",
  },
  {
    icon: Link2,
    title: "Enlaces",
    text: "Destinos que son una IP, acortadores que esconden la dirección real, dominios con caracteres que imitan letras o extensiones de alto riesgo.",
  },
];

const TIPS = [
  "Ninguna entidad seria te pide la contraseña por correo.",
  "Pasa el cursor sobre un enlace y lee el dominio real antes de hacer clic.",
  "Desconfía de la urgencia: el apuro es la herramienta favorita del fraude.",
  "Si dudas, entra al sitio escribiendo tú mismo la dirección, no desde el correo.",
  "Reporta el correo como phishing en tu webmail: así ayudas a proteger a otros.",
];

const INSTALL: { icon: LucideIcon; text: string }[] = [
  {
    icon: Puzzle,
    text: "Abre chrome://extensions, activa el modo de desarrollador y carga la carpeta de la extensión.",
  },
  {
    icon: MailCheck,
    text: "Abre un correo en Gmail, Outlook, Yahoo, AOL, Proton o Zoho (el correo, no la bandeja de entrada).",
  },
  {
    icon: MousePointerClick,
    text: "Haz clic en el ícono de Mail Guard y pulsa «Escanear correo». También puedes abrirla con Alt + Shift + M.",
  },
];

export default function GuidePage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Guía"
        description="Cómo leer un resultado y cómo reconocer un correo de phishing."
      />

      <section aria-labelledby="veredictos" className="mb-10">
        <h2 id="veredictos" className="mb-4 text-lg font-semibold">
          Cómo leer el veredicto
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {VERDICT_ORDER.map((verdict) => (
            <div
              key={verdict}
              className="rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5"
            >
              <dt>
                <VerdictBadge verdict={verdict} withIcon className="text-xs" />
              </dt>
              <dd className="mt-3 text-sm leading-6 text-guard-text-muted">
                {VERDICT_HELP[verdict]}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-6 text-guard-text-muted">
          El puntaje combina un modelo de IA (70 %) con reglas verificables (30
          %). Si una regla detecta algo grave, la alerta se mantiene aunque el
          modelo sea optimista.
        </p>
      </section>

      <section aria-labelledby="senales" className="mb-10">
        <h2 id="senales" className="mb-4 text-lg font-semibold">
          Qué revisa Mail Guard
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {SIGNALS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5"
            >
              <Icon className="h-5 w-5 text-guard-accent" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-guard-text-muted">
                {text}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-guard-text-muted">
          Mail Guard no afirma que SPF, DKIM o DMARC pasaron: la extensión no
          lee los encabezados técnicos del correo.
        </p>
      </section>

      <section
        aria-labelledby="consejos"
        className="mb-10 rounded-2xl border border-guard-accent/20 bg-guard-accent/5 p-6"
      >
        <h2 id="consejos" className="mb-4 text-lg font-semibold">
          5 hábitos que te protegen
        </h2>
        <ol className="flex flex-col gap-2.5">
          {TIPS.map((tip, index) => (
            <li key={tip} className="flex gap-3 text-sm leading-6">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-guard-accent text-xs font-bold text-guard-surface">
                {index + 1}
              </span>
              <span className="text-white/90">{tip}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="instalar">
        <h2 id="instalar" className="mb-4 text-lg font-semibold">
          Usar la extensión
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {INSTALL.map(({ icon: Icon, text }, index) => (
            <li
              key={text}
              className="flex gap-3 rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5"
            >
              <Icon
                className="h-5 w-5 shrink-0 text-guard-accent"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-guard-text-muted">
                <span className="font-semibold text-white">{index + 1}.</span>{" "}
                {text}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
