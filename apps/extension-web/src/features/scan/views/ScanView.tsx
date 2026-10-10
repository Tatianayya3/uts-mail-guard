import { ShieldCheck, ShieldEllipsis, Keyboard } from "lucide-react";
import { PROVIDER_LIST_TEXT } from "../model/providers";
import { Button } from "@mail-guard/ui";
import gmailIcon from "@/shared/icons/gmail.svg";
import outlookIcon from "@/shared/icons/outlook.svg";
import type { SupportedProvider } from "../model/mail-page";
import type { ScanViewModel } from "../useScanViewModel";
import AnalysisResultView from "./AnalysisResultView";

const PROVIDER_ICON: Partial<Record<SupportedProvider, string>> = {
  Gmail: gmailIcon,
  Outlook: outlookIcon,
};

/** Monograma con el color de la marca para los proveedores sin icono propio. */
const PROVIDER_MONOGRAM: Record<SupportedProvider, [string, string]> = {
  Gmail: ["G", "#ea4335"],
  Outlook: ["O", "#0078d4"],
  Yahoo: ["Y!", "#6001d2"],
  AOL: ["Aol", "#3a3a3a"],
  Proton: ["P", "#6d4aff"],
  Zoho: ["Z", "#e42527"],
};

function ProviderMark({ provider }: { provider: SupportedProvider }) {
  const icon = PROVIDER_ICON[provider];
  if (icon) return <img src={icon} alt="" className="h-7 w-7" />;
  const [letters, color] = PROVIDER_MONOGRAM[provider];
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black text-white"
      style={{ backgroundColor: color }}
    >
      {letters}
    </span>
  );
}

export default function ScanView({
  vm,
  dashboardUrl,
}: {
  vm: ScanViewModel;
  dashboardUrl: string;
}) {
  if (vm.result) {
    return (
      <AnalysisResultView
        result={vm.result}
        isScanning={vm.isScanning}
        saved={vm.lastSaved}
        dashboardUrl={dashboardUrl}
        onNewScan={vm.scan}
        onBack={vm.clearResult}
      />
    );
  }

  const provider =
    vm.provider !== null && vm.provider !== "unsupported" ? vm.provider : null;
  const supported = provider !== null;

  return (
    <div className="flex flex-col items-center gap-4">
      <section className="relative flex w-full flex-col items-center overflow-hidden pt-5">
        <div className="pointer-events-none absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 animate-[ambient-pulse_4s_ease-in-out_infinite] rounded-full bg-guard-accent/10 blur-3xl" />
        <div
          className={`relative flex h-48 w-48 animate-scale-in items-center justify-center ${vm.isScanning ? "scan-active-ring" : ""}`}
        >
          {vm.isScanning && (
            <div className="radar-sweep absolute inset-0 animate-radar rounded-full" />
          )}
          <div
            className={`absolute inset-2 rounded-full border border-dashed border-guard-success/30 ${vm.isScanning ? "animate-[spin_6s_linear_infinite]" : "animate-spin-slow"}`}
          />
          <div className="absolute inset-5 rounded-full border border-guard-accent/20" />
          <div className="absolute inset-8 rounded-full border-10 border-guard-surface-card" />
          <div className="absolute inset-12 rounded-full bg-guard-surface-raised shadow-[0_0_35px_rgba(200,212,0,0.18)]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-4xl text-guard-accent">
              <ShieldEllipsis
                className="h-10 w-10"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-[11px] font-bold tracking-[0.2em] text-guard-text-muted">
              {vm.isScanning ? "ANALIZANDO" : supported ? "LISTO" : "EN ESPERA"}
            </p>
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Analiza este correo
        </h1>
        <p className="mt-2 max-w-82.5 text-center text-sm leading-6 text-guard-text-muted">
          Detecta dominios que imitan marcas, enlaces engañosos y mensajes que
          buscan robar tus datos.
        </p>

        <Button
          size="lg"
          onClick={() => void vm.scan()}
          loading={vm.isScanning}
          disabled={!supported}
          className="mt-5 h-14 w-full rounded-2xl text-lg font-bold"
        >
          {vm.isScanning ? "Analizando…" : "Escanear correo"}
        </Button>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-guard-text-muted">
          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" /> Atajo para
          abrir:{" "}
          <kbd className="font-sans font-semibold text-white">
            Alt + Shift + M
          </kbd>
        </p>
        {vm.quota && (
          <p
            key={vm.quota.remaining}
            className="mt-3 animate-fade-in text-xs text-guard-text-muted"
          >
            Te quedan{" "}
            <span className="font-semibold text-white">
              {vm.quota.remaining}
            </span>{" "}
            de {vm.quota.limit} análisis hoy
          </p>
        )}
      </section>

      <section
        className="w-full animate-fade-up rounded-2xl bg-guard-surface-card p-4 [animation-delay:120ms]"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            {provider ? (
              <ProviderMark provider={provider} />
            ) : (
              <span className="text-guard-text-muted">?</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {vm.provider === null
                ? "Detectando…"
                : (provider ?? "Sitio no compatible")}
            </p>
            <p className="text-xs text-guard-text-muted">
              {supported
                ? "Abre un correo y pulsa «Escanear correo»."
                : `Abre tu correo en ${PROVIDER_LIST_TEXT}.`}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${supported ? "bg-guard-success-strong/10 text-guard-success" : "bg-amber-300/10 text-amber-200"}`}
          >
            {supported ? "Compatible" : "No compatible"}
          </span>
        </div>
      </section>

      <section className="flex w-full animate-fade-up items-start gap-3 rounded-2xl bg-guard-surface-card p-4 [animation-delay:200ms]">
        <span className="mt-0.5 text-guard-success">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold text-white">
            Tu privacidad primero
          </p>
          <p className="mt-1 text-[11px] leading-4 text-guard-text-muted">
            Solo enviamos el remitente, el asunto, el texto y los enlaces del
            correo abierto. Nunca adjuntos ni contraseñas.
          </p>
        </div>
      </section>
    </div>
  );
}
