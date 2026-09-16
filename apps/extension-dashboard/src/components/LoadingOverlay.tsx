type LoadingOverlayProps = {
  title: string;
  description?: string;
};

export default function LoadingOverlay({
  title,
  description,
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-guard-surface/85 backdrop-blur-sm transition-all animate-modal-backdrop">
      <div className="flex flex-col items-center rounded-2xl border border-guard-accent/25 bg-guard-surface-raised/95 px-8 py-7 text-center shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md animate-modal-panel">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-guard-accent/20 animate-ping opacity-25" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-guard-accent border-r-guard-success" />
          <div className="absolute inset-2 animate-[spin_3s_linear_infinite_reverse] rounded-full border border-dashed border-guard-accent/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-guard-accent shadow-[0_0_12px_#c8d400] animate-pulse" />
        </div>

        <p className="mt-4 text-sm font-bold tracking-tight text-white">
          {title}
        </p>
        {description && (
          <p className="mt-1 max-w-[220px] text-[11px] text-guard-text-muted">
            {description}
          </p>
        )}

        <div className="mt-3.5 h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full bg-gradient-to-r from-guard-accent to-guard-success animate-pulse" />
        </div>
      </div>
    </div>
  );
}
