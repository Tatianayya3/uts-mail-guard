import VeredictoIcon from "@/components/icons/Veredicto";
import { SignalCard } from "./AnalysisCards";
import type { ScanResult } from "./scan.types";
import TrustScoreRing from "./TrustScoreRing";
import ConsejoIcon from "@/components/icons/Consejo";
import NuevoAnalisisIcon from "@/components/icons/NuevoAnalisis";
import LeftArrowIcon from "@/components/icons/LeftArrow";

type AnalysisResultProps = {
  result: ScanResult;
  isScanning: boolean;
  onNewScan: () => Promise<void>;
  onBack: () => void;
};

export default function AnalysisResult({
  result,
  isScanning,
  onNewScan,
  onBack,
}: AnalysisResultProps) {
  const verdict = {
    safe: "Seguro",
    suspicious: "Sospechoso",
    dangerous: "Peligroso",
    unknown: "Sin determinar",
  }[result.verdict];
  const verdictTone = {
    safe: "text-guard-success",
    suspicious: "text-amber-300",
    dangerous: "text-red-300",
    unknown: "text-guard-text-muted",
  }[result.verdict];
  const signalLabels: Record<string, string> = {
    sender: "Remitente",
    authentication: "Autenticación",
    content: "Contenido",
    links: "Enlaces",
  };
  const visibleSignals = result.signals.filter(
    (signal) => signal.key !== "authentication" || signal.status !== "unknown",
  );
  const reviewedSignals = result.signals.filter(
    (signal) => visibleSignals.includes(signal) && signal.status === "pass",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header row: back button + status label + new scan button */}
      <div className="flex items-center justify-between gap-2 pt-4">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          disabled={isScanning}
          title="Volver al escáner"
          className="flex cursor-pointer h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-guard-surface-card text-guard-text-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          aria-label="Volver al escáner"
        >
          <LeftArrowIcon />
        </button>

        <button
          type="button"
          onClick={() => void onNewScan()}
          disabled={isScanning}
          className="flex cursor-pointer h-9 items-center gap-2 rounded-xl border border-guard-accent/40 bg-guard-accent px-3 text-xs font-bold text-guard-surface shadow-[0_0_20px_rgba(200,212,0,0.18)] transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
        >
          {isScanning ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-guard-surface/30 border-t-guard-surface" />
          ) : (
            <NuevoAnalisisIcon />
          )}
          {isScanning ? "Analizando..." : "Nuevo análisis"}
        </button>
      </div>

      {/* ─── Content area with scanning overlay ─── */}
      <div className="relative">
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-14 rounded-2xl bg-guard-surface/85 backdrop-blur-sm transition-all animate-fade-in">
            <div className="sticky top-16 flex flex-col items-center rounded-2xl border border-guard-accent/25 bg-guard-surface-raised/95 px-6 py-5 text-center shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
              {/* Animated ring */}
              <div className="relative flex h-14 w-14 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-guard-accent/20 animate-ping opacity-25" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-guard-accent border-r-guard-success" />
                <div className="absolute inset-2 animate-[spin_3s_linear_infinite_reverse] rounded-full border border-dashed border-guard-accent/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-guard-accent shadow-[0_0_12px_#c8d400] animate-pulse" />
              </div>

              <p className="mt-3 text-sm font-bold tracking-tight text-white">
                Analizando correo
              </p>
              <p className="mt-1 max-w-[210px] text-[11px] text-guard-text-muted">
                Consultando escudo neural e inspeccionando señales...
              </p>

              <div className="mt-3.5 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full bg-gradient-to-r from-guard-accent to-guard-success animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* Actual content (blurred/dimmed when scanning) */}
        <div
          className={`flex flex-col gap-4 transition-all duration-300 ${isScanning ? "pointer-events-none select-none opacity-30 blur-[1px]" : ""}`}
        >
          <section className="relative isolate flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5.5 px-5 py-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div
              className={`pointer-events-none absolute left-1/2 top-1/2 -z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${result.verdict === "safe" ? "bg-guard-success/8" : result.verdict === "dangerous" ? "bg-red-400/8" : result.verdict === "suspicious" ? "bg-amber-300/8" : "bg-white/5"}`}
            />
            <TrustScoreRing
              score={result.trustScore}
              verdict={result.verdict}
            />
            <div
              className={`mx-auto mt-5 w-fit rounded-full border px-3 py-1 text-[11px] font-medium ${result.verdict === "safe" ? "border-guard-success/10 bg-guard-success-strong/15 text-guard-success" : result.verdict === "dangerous" ? "border-red-300/20 bg-red-400/10 text-red-300" : result.verdict === "suspicious" ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-white/10 bg-white/5 text-guard-text-muted"}`}
            >
              {result.sender.domainStatus === "valid"
                ? "Dominio válido"
                : "Revisa el dominio"}
            </div>
          </section>

          <section className="rounded-2xl bg-guard-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 justify-center">
                <VeredictoIcon className={`${verdictTone}`} />
                <p className={`text-xs font-bold ${verdictTone}`}>
                  VEREDICTO DE IA
                </p>
              </div>
              <span className="rounded bg-guard-surface-raised px-2 py-1 text-[10px] text-guard-text-muted">
                Modelo: {result.model}
              </span>
            </div>
            <p className="mt-3 text-base text-white">
              {verdict}{" "}
              <span className="ml-1 inline-block h-4 w-4 align-[-2px]" />
            </p>
            <p className="mt-1 text-xs leading-5 text-guard-text-muted">
              {result.summary}
            </p>
            <div className="mt-4 rounded-xl border border-guard-accent/15 bg-guard-accent/10 px-3 py-3 text-left">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-guard-accent">
                  Consejo de seguridad
                </p>
                <ConsejoIcon />
              </div>
              <p className="mt-1 text-xs leading-5 text-guard-text-muted">
                {result.advice ||
                  "Verifica el remitente y evita abrir enlaces o archivos si tienes dudas."}
              </p>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[10px] font-medium tracking-wide text-guard-text-muted">
                SEÑALES DETECTADAS
              </p>
              <p className="text-[10px] font-medium tracking-wide text-guard-accent">
                {reviewedSignals}/{visibleSignals.length} Validadas
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {visibleSignals.map((signal) => (
                <SignalCard
                  key={signal.key}
                  label={signalLabels[signal.key] ?? signal.label}
                  value={signal.value}
                  detail={signal.detail}
                  status={signal.status}
                />
              ))}
            </div>
            {visibleSignals.length === 0 && (
              <p className="rounded-xl bg-guard-surface-raised px-3 py-3 text-xs text-guard-text-muted">
                No hubo señales suficientes para validar este correo.
              </p>
            )}
          </section>

          <div className="mx-auto rounded-full bg-guard-surface-card px-4 py-2 text-[10px] text-guard-text-muted">
            <span className="text-guard-success">●</span> {result.links.length}{" "}
            enlaces revisados
            <span className="mx-2 text-guard-success">•</span>{" "}
            {result.analyzedAt.slice(0, 10)}
          </div>
        </div>
      </div>
    </div>
  );
}
