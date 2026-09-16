export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-guard-surface text-white">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-guard-accent/20 animate-ping opacity-25" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-guard-accent border-r-guard-success" />
        <div className="absolute inset-2 animate-[spin_3s_linear_infinite_reverse] rounded-full border border-dashed border-guard-accent/40" />
        <div className="h-3 w-3 rounded-full bg-guard-accent shadow-[0_0_12px_#c8d400] animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold tracking-tight">
          Cargando tu panel de seguridad
        </p>
        <p className="mt-1 text-xs text-guard-text-muted">
          Sincronizando tus análisis y métricas...
        </p>
      </div>
    </div>
  );
}
