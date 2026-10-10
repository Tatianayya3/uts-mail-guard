export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
    >
      {message} Mostramos la información disponible; usa «Actualizar» para
      reintentar.
    </div>
  );
}
