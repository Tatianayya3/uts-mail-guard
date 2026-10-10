import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  Fingerprint,
  Link2,
  Lightbulb,
  Mail,
} from "lucide-react";
import {
  SIGNAL_KEY_LABEL,
  SIGNAL_STATUS_LABEL,
  VERDICT_LABEL,
  type ScanRecord,
  type SignalStatus,
} from "@mail-guard/contracts";
import { TrustRing, VerdictBadge, cn } from "@mail-guard/ui";
import CopyButton from "./CopyButton";
import { formatFullDate } from "./dashboard.utils";

const STATUS_TONE: Record<SignalStatus, string> = {
  pass: "border-guard-success/20 bg-guard-success-strong/15 text-guard-success",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  fail: "border-red-300/20 bg-red-400/10 text-red-300",
  unknown: "border-white/10 bg-white/5 text-guard-text-muted",
};

/** UC-10: detalle completo de un análisis, con URL propia para compartirlo o volver. */
export default function ScanDetail({ scan }: { scan: ScanRecord }) {
  const riskyLinks = scan.links.filter(
    (l) => l.status === "dangerous" || l.status === "suspicious",
  ).length;

  return (
    <article className="max-w-5xl">
      <Link
        href="/dashboard/historial"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-guard-text-muted hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al historial
      </Link>

      <header className="mb-6 flex flex-col gap-6 rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-6 md:flex-row md:items-center">
        <TrustRing
          score={scan.trustScore}
          verdict={scan.verdict}
          caption="Confianza"
          className="h-36 w-36 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <VerdictBadge verdict={scan.verdict} withIcon className="text-xs" />
          <h1 className="mt-3 text-2xl font-bold break-words">
            {scan.subject || "Correo sin asunto"}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-guard-text-muted">
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            {scan.sender.displayName ? `${scan.sender.displayName} · ` : ""}
            {scan.sender.email}
          </p>
          <p className="mt-4 text-sm leading-6 text-white/90">{scan.summary}</p>
        </div>
      </header>

      <div className="mb-6 flex gap-3 rounded-2xl border border-guard-accent/20 bg-guard-accent/5 p-4">
        <Lightbulb
          className="mt-0.5 h-5 w-5 shrink-0 text-guard-accent"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-guard-accent">Qué hacer</p>
          <p className="mt-1 text-sm leading-6 text-guard-text-muted">
            {scan.advice}
          </p>
        </div>
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="signals-title">
          <h2
            id="signals-title"
            className="mb-3 text-xs font-semibold uppercase tracking-wide text-guard-text-muted"
          >
            Señales analizadas
          </h2>
          {scan.signals.length === 0 ? (
            <p className="text-sm text-guard-text-muted">
              No hubo señales suficientes.
            </p>
          ) : (
            <ul className="stagger flex flex-col gap-2">
              {scan.signals.map((signal, index) => (
                <li
                  key={`${signal.key}-${index}`}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {SIGNAL_KEY_LABEL[signal.key] ?? signal.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        STATUS_TONE[signal.status],
                      )}
                    >
                      {SIGNAL_STATUS_LABEL[signal.status]}
                    </span>
                  </div>
                  <p className="text-sm text-white/85">{signal.value}</p>
                  <p className="mt-1 text-xs leading-5 text-guard-text-muted">
                    {signal.detail}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="links-title">
          <h2
            id="links-title"
            className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-guard-text-muted"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Enlaces ({scan.links.length}
            {riskyLinks > 0 ? ` · ${riskyLinks} con alertas` : ""})
          </h2>
          {scan.links.length === 0 ? (
            <p className="text-sm text-guard-text-muted">
              El correo no tenía enlaces.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-guard-text-muted/80">
                Por seguridad, los enlaces no son clicables. Cópialos solo si
                necesitas revisarlos.
              </p>
              <ul className="stagger flex flex-col gap-2">
                {scan.links.map((link, index) => (
                  <li
                    key={`${link.url}-${index}`}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {link.label}
                      </span>
                      <VerdictBadge verdict={link.status}>
                        {VERDICT_LABEL[link.status]}
                      </VerdictBadge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code className="min-w-0 flex-1 truncate text-xs text-guard-text-muted">
                        {link.url}
                      </code>
                      <CopyButton value={link.url} label="" />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-guard-text-muted/80">
                      {link.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <footer className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-guard-surface-raised pt-4 text-xs text-guard-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" /> {scan.model}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{" "}
          {formatFullDate(scan.analyzedAt)}
        </span>
        {scan.emailHash && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Fingerprint className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate font-mono">
              {scan.emailHash.slice(0, 16)}…
            </span>
            <CopyButton value={scan.emailHash} label="" />
          </span>
        )}
      </footer>
    </article>
  );
}
