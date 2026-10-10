import Link from "next/link";
import { SearchX } from "lucide-react";

export default function ScanNotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <SearchX
        className="mx-auto h-8 w-8 text-guard-text-muted"
        aria-hidden="true"
      />
      <h1 className="mt-4 text-xl font-bold">No encontramos ese análisis</h1>
      <p className="mt-2 text-sm text-guard-text-muted">
        Puede que lo hayas borrado o que el enlace no sea tuyo.
      </p>
      <Link
        href="/dashboard/historial"
        className="mt-6 inline-block text-sm font-semibold text-guard-accent"
      >
        Volver al historial
      </Link>
    </div>
  );
}
