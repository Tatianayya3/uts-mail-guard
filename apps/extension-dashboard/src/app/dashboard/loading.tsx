/**
 * Esqueleto con la misma forma del panel: la página no «salta» cuando llegan
 * los datos y la espera se percibe más corta que con un spinner.
 */
function Block({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-guard-surface-card/60 ${className}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen bg-guard-surface"
      role="status"
      aria-label="Cargando tu panel"
    >
      <div className="border-b border-guard-surface-raised">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Block className="h-8 w-36" />
          <Block className="h-8 w-48" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <Block className="mb-2 h-8 w-64" />
        <Block className="mb-6 h-4 w-80" />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Block key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Block className="h-80 lg:col-span-2" />
          <Block className="h-80" />
          <Block className="h-72 lg:col-span-3" />
        </div>
      </div>
      <span className="sr-only">Cargando tus análisis y métricas…</span>
    </div>
  );
}
