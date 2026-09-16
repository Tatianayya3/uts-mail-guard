"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bot,
  CalendarClock,
  Fingerprint,
  Link2,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  SIGNAL_STATUS_BADGE_CLASS,
  SIGNAL_STATUS_LABEL,
  VERDICT_BADGE_CLASS,
  VERDICT_LABEL,
} from "./dashboard.constants";
import { formatFullDate } from "./dashboard.utils";
import type { MailScanRecord } from "./dashboard.types";
import CopyButton from "./CopyButton";

const VERDICT_ICON: Record<MailScanRecord["verdict"], LucideIcon> = {
  safe: ShieldCheck,
  suspicious: ShieldAlert,
  dangerous: ShieldX,
  unknown: ShieldQuestion,
};

type ScanDetailModalProps = {
  scan: MailScanRecord;
  onClose: () => void;
};

export default function ScanDetailModal({
  scan,
  onClose,
}: ScanDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    // Lock background scroll while the modal is open, and restore whatever
    // the previous value was (another modal may already have set it).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const VerdictIcon = VERDICT_ICON[scan.verdict];

  // Rendered into `document.body` so the overlay covers the whole viewport
  // instead of being clipped by an ancestor's `backdrop-blur` (any filter /
  // backdrop-filter / transform on an ancestor creates a containing block
  // that `position: fixed` would otherwise be trapped inside).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="animate-modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="animate-modal-panel relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-guard-surface-raised bg-guard-surface-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-5 md:p-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${VERDICT_BADGE_CLASS[scan.verdict]}`}
              >
                <VerdictIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                {VERDICT_LABEL[scan.verdict]}
              </span>
              <span className="text-xs font-semibold text-white">
                {scan.trustScore}% de confianza
              </span>
            </div>
            <h2
              id="scan-detail-title"
              className="truncate text-lg font-bold text-white"
            >
              {scan.subject || "Correo sin asunto"}
            </h2>
            <p className="mt-1 truncate text-xs text-guard-text-muted">
              {scan.sender.displayName} · {scan.sender.email} (
              {scan.sender.domain})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1.5 text-guard-text-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          <p className="text-sm leading-6 text-white/90">{scan.summary}</p>

          <div className="mt-4 flex gap-3 rounded-xl border border-guard-accent/20 bg-guard-accent/5 p-3.5">
            <Lightbulb
              className="mt-0.5 h-4 w-4 shrink-0 text-guard-accent"
              strokeWidth={2}
            />
            <p className="text-xs leading-5 text-guard-text-muted">
              {scan.advice}
            </p>
          </div>

          {scan.signals.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-guard-text-muted">
                Señales analizadas
              </h3>
              <ul className="flex flex-col gap-2">
                {scan.signals.map((signal, index) => (
                  <li
                    key={`${signal.key}-${index}`}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {signal.label}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SIGNAL_STATUS_BADGE_CLASS[signal.status]}`}
                      >
                        {SIGNAL_STATUS_LABEL[signal.status]}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-guard-text-muted">
                      {signal.value}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-guard-text-muted/80">
                      {signal.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scan.links.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-guard-text-muted">
                <Link2 className="h-3.5 w-3.5" strokeWidth={2.25} />
                Enlaces detectados
              </h3>
              <p className="mb-3 text-[11px] text-guard-text-muted/70">
                Por seguridad, los enlaces no son clicables aquí. Cópialos solo
                si necesitas inspeccionarlos manualmente.
              </p>
              <ul className="flex flex-col gap-2">
                {scan.links.map((link, index) => (
                  <li
                    key={`${link.url}-${index}`}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {link.label}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${VERDICT_BADGE_CLASS[link.status]}`}
                      >
                        {VERDICT_LABEL[link.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code className="min-w-0 flex-1 truncate text-[11px] text-guard-text-muted">
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
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/5 px-5 py-3 text-[10px] text-guard-text-muted md:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Bot className="h-3 w-3" strokeWidth={2.25} />
            {scan.model}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3" strokeWidth={2.25} />
            {formatFullDate(scan.analyzedAt)}
          </span>
          {scan.emailHash && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Fingerprint className="h-3 w-3 shrink-0" strokeWidth={2.25} />
              <span className="truncate font-mono">
                {scan.emailHash.slice(0, 16)}…
              </span>
              <CopyButton value={scan.emailHash} label="" />
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
