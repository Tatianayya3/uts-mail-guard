import { useEffect, useState } from "react";
import ScanShieldIcon from "@/components/icons/ScanShield";
import AnalysisResult from "./AnalysisResult";
import { StatCard } from "./AnalysisCards";
import { getActiveMailProvider, scanActiveEmail } from "./scan.service";
import type { MailProvider, ScanResult } from "./scan.types";

type ScanTabProps = {
  isAnalyzed: boolean;
  scanResult: ScanResult | null;
  onScanResultChange: (result: ScanResult | null) => void;
};

export default function ScanTab({
  isAnalyzed,
  scanResult,
  onScanResultChange,
}: ScanTabProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [activeProvider, setActiveProvider] = useState<MailProvider>(
    "Proveedor compatible",
  );

  useEffect(() => {
    void getActiveMailProvider().then(setActiveProvider);
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setScanError("");
    try {
      const result = await scanActiveEmail();
      onScanResultChange(result);
    } catch (error) {
      setScanError(
        error instanceof Error
          ? error.message
          : "No se pudo escanear este correo.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleNewScan = async () => {
    setIsScanning(true);
    setScanError("");
    try {
      const result = await scanActiveEmail();
      onScanResultChange(result);
    } catch (error) {
      setScanError(
        error instanceof Error
          ? error.message
          : "No se pudo analizar este correo.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  if (isAnalyzed) {
    return scanResult ? (
      <AnalysisResult
        result={scanResult}
        isScanning={isScanning}
        onNewScan={handleNewScan}
        onBack={() => onScanResultChange(null)}
      />
    ) : null;
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <section className="relative flex w-full flex-col items-center overflow-hidden pt-5">
        <div className="pointer-events-none absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 animate-[ambient-pulse_4s_ease-in-out_infinite] rounded-full bg-guard-accent/10 blur-3xl" />
        <div
          className={`relative flex h-52 w-52 items-center justify-center ${isScanning ? "scan-active-ring" : ""}`}
        >
          <div className="absolute inset-2 rounded-full border border-dashed border-guard-success/30" />
          <div className="absolute inset-5 rounded-full border border-guard-accent/20" />
          <div className="absolute inset-8 rounded-full border-10 border-guard-surface-card" />
          <div className="absolute inset-12 rounded-full bg-guard-surface-raised shadow-[0_0_35px_rgba(200,212,0,0.18)]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-4xl text-guard-accent">
              <ScanShieldIcon />
            </div>
            <p className="mt-2 text-[11px] font-bold tracking-[0.2em] text-guard-text-muted">
              {isScanning ? "ANALIZANDO" : "EN ESPERA"}
            </p>
          </div>
          <span className="absolute left-1 top-12 h-2 w-2 rounded-full bg-guard-accent shadow-[0_0_10px_#c8d400]" />
          <span className="absolute bottom-7 right-4 h-2 w-2 rounded-full bg-guard-success-strong" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Analiza este correo
        </h1>
        <p className="mt-2 max-w-82.5 text-center text-sm leading-6 text-guard-text-muted">
          Escanea el correo que estás viendo para detectar dominios falsos,
          amenazas ocultas y enlaces maliciosos.
        </p>

        {scanError && (
          <p
            role="alert"
            className="mt-4 w-full rounded-xl bg-red-400/10 px-3 py-2 text-center text-xs leading-5 text-red-200"
          >
            {scanError}
          </p>
        )}

        <button
          type="button"
          onClick={handleScan}
          disabled={isScanning}
          className="mt-6 cursor-pointer flex h-14 w-full items-center justify-center gap-0.5 rounded-2xl bg-guard-accent text-lg font-bold text-guard-surface shadow-[0_8px_24px_rgba(200,212,0,0.16)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        >
          {isScanning ? "Analizando..." : "Escanear correo"}
        </button>
        <p className="mt-3 text-xs text-guard-text-muted">
          Seguridad de correo con IA
        </p>
      </section>

      <section className="w-full rounded-2xl bg-guard-surface-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5">
            {activeProvider === "Gmail" && (
              <img
                src="../../src/components/icons/gmail.svg"
                alt="Gmail"
                className="h-8 w-8 m-auto mt-1"
              />
            )}
            {activeProvider === "Outlook" && (
              <img
                src="../../src/components/icons/outlook.svg"
                alt="Outlook"
                className="h-8 w-8 m-auto mt-1"
              />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{activeProvider}</p>
            <p className="text-xs text-guard-text-muted">
              {activeProvider === "Proveedor no compatible"
                ? "Abre Gmail u Outlook"
                : "Pestaña vinculada • Lista"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${activeProvider === "Proveedor no compatible" ? "bg-amber-300/10 text-amber-200" : "bg-guard-success-strong/10 text-guard-success"}`}
          >
            {activeProvider === "Proveedor no compatible"
              ? "No compatible"
              : "Conectado"}
          </span>
        </div>
      </section>

      <section className="w-full rounded-2xl bg-guard-surface-card p-4">
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold tracking-wide text-guard-text-muted">
          <span>MOTOR DE DETECCIÓN</span>
          <span className="text-guard-accent">Núcleo neural v4.8</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard value="0 ms" label="Latencia" />
          <StatCard value="100%" label="Confianza cero" accent />
          <StatCard value="Nube" label="Aislado" />
        </div>
      </section>
    </div>
  );
}
