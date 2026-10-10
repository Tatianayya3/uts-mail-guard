import Image from "next/image";
import RefreshButton from "./RefreshButton";
import SignOutButton from "./SignOutButton";

type DashboardTopbarProps = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

export default function DashboardTopbar({
  displayName,
  email,
  avatarUrl,
}: DashboardTopbarProps) {
  const initials = displayName.slice(0, 2).toUpperCase();
  return (
    <header className="sticky top-0 z-30 border-b border-guard-surface-raised bg-guard-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={32} height={32} />
          <p className="text-sm font-bold text-white">Mail Guard</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <SignOutButton />
          <div className="ml-1 flex items-center gap-2.5 border-l border-guard-surface-raised pl-3">
            {avatarUrl ? (
              // Avatar externo de Supabase: dominio arbitrario, sin optimizar.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-guard-accent text-[11px] font-black text-guard-surface"
                aria-hidden="true"
              >
                {initials}
              </span>
            )}
            <div className="hidden min-w-0 md:block">
              <p className="max-w-40 truncate text-xs font-semibold text-white">
                {displayName}
              </p>
              <p className="max-w-40 truncate text-[11px] text-guard-text-muted">
                {email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
