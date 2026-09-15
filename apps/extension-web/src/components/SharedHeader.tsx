import MailGuardIcon from "@/components/icons/MailGuard";

export default function SharedHeader() {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-white/5 bg-guard-surface-raised px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center">
          <MailGuardIcon />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold tracking-[0.16em]">MAIL GUARD</p>
          <p className="text-[10px] text-guard-text-muted">Escáner activo</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-guard-success-strong/15 px-2 py-1 text-[10px] font-semibold text-guard-success">
          <span className="mr-1 text-guard-success-strong animate-pulse">
            ●
          </span>
          Activo
        </span>
      </div>
    </header>
  );
}
