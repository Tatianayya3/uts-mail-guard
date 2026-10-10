/**
 * A diferencia del layout, el template se vuelve a montar en cada navegación:
 * sirve para animar la entrada de cada subpágina del panel. Sin fill-mode, para
 * no dejar un transform que cambie el contexto de los elementos fixed.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-[fade-up_0.45s_var(--ease-out-expo)]">
      {children}
    </div>
  );
}
