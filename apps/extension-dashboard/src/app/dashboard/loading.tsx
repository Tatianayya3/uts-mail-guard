import { Skeleton } from "@mail-guard/ui";

/**
 * Esqueleto del contenido (la barra y el menú ya están visibles): la página
 * no «salta» cuando llegan los datos.
 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Cargando">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-8 h-4 w-80" />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
