import { MailOpen, MousePointerClick, Puzzle } from "lucide-react";

const STEPS = [
  {
    icon: Puzzle,
    title: "Instala la extensión",
    text: "Cárgala en Chrome desde chrome://extensions (modo desarrollador).",
  },
  {
    icon: MailOpen,
    title: "Abre un correo",
    text: "El que quieras revisar, en Gmail, Outlook, Yahoo u otro webmail compatible.",
  },
  {
    icon: MousePointerClick,
    title: "Pulsa «Escanear correo»",
    text: "Con tu sesión iniciada, el resultado aparecerá aquí.",
  },
];

/** Estado vacío del panel: en vez de gráficos en cero, los primeros pasos. */
export default function Onboarding() {
  return (
    <section
      aria-labelledby="onboarding-title"
      className="mb-8 rounded-2xl border border-guard-accent/20 bg-guard-accent/5 p-6 md:p-8"
    >
      <h2 id="onboarding-title" className="text-lg font-semibold text-white">
        Empieza en tres pasos
      </h2>
      <p className="mt-1 text-sm text-guard-text-muted">
        Aún no tienes análisis. Cuando escanees tu primer correo, verás aquí tus
        métricas.
      </p>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className="flex gap-3 rounded-xl bg-guard-surface-card/60 p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-guard-accent text-guard-surface">
              <Icon
                className="h-4.5 w-4.5"
                strokeWidth={2.25}
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                {index + 1}. {title}
              </p>
              <p className="mt-1 text-xs leading-5 text-guard-text-muted">
                {text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
