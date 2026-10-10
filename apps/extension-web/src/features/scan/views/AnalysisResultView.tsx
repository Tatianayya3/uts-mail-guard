import {
  SIGNAL_KEY_LABEL,
  VERDICT_COLOR,
  VERDICT_LABEL,
  type DomainStatus,
  type StoredScan,
  type Verdict,
} from "@mail-guard/contracts";
import ConsejoIcon from "@/shared/icons/Consejo";
import LeftArrowIcon from "@/shared/icons/LeftArrow";
import NuevoAnalisisIcon from "@/shared/icons/NuevoAnalisis";
import VeredictoIcon from "@/shared/icons/Veredicto";
import SignalCard from "./SignalCard";
import TrustScoreRing from "./TrustScoreRing";

const VERDICT_TEXT: Record<Verdict, string> = {
  safe: "text-guard-success",
  suspicious: "text-amber-300",
  dangerous: "text-red-300",
  unknown: "text-guard-text-muted",
};

const VERDICT_CHIP: Record<Verdict, string> = {
  safe: "border-guard-success/10 bg-guard-success-strong/15 text-guard-success",
  suspicious: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  dangerous: "border-red-300/20 bg-red-400/10 text-red-300",
  unknown: "border-white/10 bg-white/5 text-guard-text-muted",
};

const DOMAIN_LABEL: Record<DomainStatus, string> = {
  valid: "Dominio reconocido",
  suspicious: "Dominio sospechoso",
  unknown: "Dominio sin verificar",
};

const dateFormat = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

type Props = {
  result: StoredScan;
  isScanning: boolean;
  onNewScan: () => Promise<void>;
  onBack: () => void;
};

export default function AnalysisResultView({
  result,
  isScanning,
  onNewScan,
  onBack,
}: Props) {
  const signals = result.signals.filter(
    (s) => s.key !== "authentication" || s.status !== "unknown",
  );
  const passed = signals.filter((s) => s.status === "pass").length;
  const riskyLinks = result.links.filter(
    (l) => l.status === "dangerous" || l.status === "suspicious",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isScanning}
          aria-label="Volver al escáner"
          title="Volver al escáner"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-guard-surface-card text-guard-text-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LeftArrowIcon />
        </button>
        <button
          type="button"
          onClick={() => void onNewScan()}
          disabled={isScanning}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-guard-accent/40 bg-guard-accent px-3 text-xs font-bold text-guard-surface shadow-[0_0_20px_rgba(200,212,0,0.18)] transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
        >
          {isScanning ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-guard-surface/30 border-t-guard-surface" />
          ) : (
            <NuevoAnalisisIcon />
          )}
          {isScanning ? "Analizando..." : "Nuevo análisis"}
        </button>
      </div>

      <div className="relative" aria-busy={isScanning}>
        {isScanning && (
          <div className="absolute inset-0 z-20 flex justify-center rounded-2xl bg-guard-surface/85 pt-14 backdrop-blur-sm animate-fade-in">
            <div className="sticky top-16 flex h-fit flex-col items-center rounded-2xl border border-guard-accent/25 bg-guard-surface-raised/95 px-6 py-5 text-center shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-guard-accent border-r-guard-success" />
              <p className="mt-3 text-sm font-bold text-white">
                Analizando correo
              </p>
              <p className="mt-1 max-w-52 text-[11px] text-guard-text-muted">
                Revisando remitente, contenido y enlaces…
              </p>
            </div>
          </div>
        )}

        <div
          className={`flex flex-col gap-4 transition-all duration-300 ${isScanning ? "pointer-events-none select-none opacity-30 blur-[1px]" : ""}`}
        >
          <section className="relative isolate flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
              style={{ backgroundColor: VERDICT_COLOR[result.verdict] }}
            />
            <TrustScoreRing
              score={result.trustScore}
              verdict={result.verdict}
            />
            <p
              className="mt-4 max-w-full truncate text-sm font-semibold text-white"
              title={result.subject}
            >
              {result.subject}
            </p>
            <p className="max-w-full truncate text-[11px] text-guard-text-muted">
              {result.sender.email}
            </p>
            <span
              className={`mt-3 rounded-full border px-3 py-1 text-[11px] font-medium ${VERDICT_CHIP[result.verdict]}`}
            >
              {DOMAIN_LABEL[result.sender.domainStatus]}
            </span>
          </section>

          <section className="rounded-2xl bg-guard-surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex items-center gap-1 ${VERDICT_TEXT[result.verdict]}`}
              >
                <VeredictoIcon />
                <p className="text-xs font-bold">VEREDICTO</p>
              </div>
              <span
                className="truncate rounded bg-guard-surface-raised px-2 py-1 text-[10px] text-guard-text-muted"
                title={result.model}
              >
                {result.model}
              </span>
            </div>
            <p
              className={`mt-3 text-base font-semibold ${VERDICT_TEXT[result.verdict]}`}
            >
              {VERDICT_LABEL[result.verdict]}
            </p>
            <p className="mt-1 text-xs leading-5 text-guard-text-muted">
              {result.summary}
            </p>
            <div className="mt-4 rounded-xl border border-guard-accent/15 bg-guard-accent/10 px-3 py-3">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-guard-accent">
                  Consejo de seguridad
                </p>
                <ConsejoIcon />
              </div>
              <p className="mt-1 text-xs leading-5 text-guard-text-muted">
                {result.advice}
              </p>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-medium tracking-wide">
              <p className="text-guard-text-muted">SEÑALES DETECTADAS</p>
              <p className="text-guard-accent">
                {passed}/{signals.length} sin alertas
              </p>
            </div>
            {signals.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {signals.map((signal) => (
                  <SignalCard
                    key={signal.key}
                    label={SIGNAL_KEY_LABEL[signal.key] ?? signal.label}
                    value={signal.value}
                    detail={signal.detail}
                    status={signal.status}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-guard-surface-raised px-3 py-3 text-xs text-guard-text-muted">
                No hubo señales suficientes para validar este correo.
              </p>
            )}
          </section>

          {riskyLinks.length > 0 && (
            <section className="rounded-2xl border border-red-400/15 bg-red-400/5 p-3">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-red-200">
                ENLACES CON ALERTAS · no los abras
              </p>
              <ul className="flex flex-col gap-1.5">
                {riskyLinks.slice(0, 5).map((link) => (
                  <li
                    key={link.url}
                    className="rounded-lg bg-black/20 px-2.5 py-2"
                  >
                    <p
                      className="truncate font-mono text-[10px] text-white/90"
                      title={link.url}
                    >
                      {link.url}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-guard-text-muted">
                      {link.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mx-auto rounded-full bg-guard-surface-card px-4 py-2 text-[10px] text-guard-text-muted">
            <span className="text-guard-success">●</span> {result.links.length}{" "}
            enlaces revisados
            <span className="mx-2 text-guard-success">•</span>
            {dateFormat.format(new Date(result.analyzedAt))}
          </p>
        </div>
      </div>
    </div>
  );
}
