import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import NavLinks from "./NavLinks";
import RefreshButton from "./RefreshButton";
import SignOutButton from "./SignOutButton";

type DashboardShellProps = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  children: ReactNode;
};

/** Estructura común de todas las páginas del panel. */
export default function DashboardShell({
  displayName,
  email,
  avatarUrl,
  children,
}: DashboardShellProps) {
  const initials = displayName.slice(0, 2).toUpperCase();
  return (
    <div className="min-h-screen bg-guard-surface text-white">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-guard-accent focus:px-3 focus:py-2 focus:text-guard-surface"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-guard-surface-raised bg-guard-surface/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={30} height={30} priority />
            <span className="text-sm font-bold">Mail Guard</span>
          </Link>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <SignOutButton />
            <div className="ml-1 flex items-center gap-2.5 border-l border-guard-surface-raised pl-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar externo de dominio arbitrario
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
                <p className="max-w-40 truncate text-xs font-semibold">
                  {displayName}
                </p>
                <p className="max-w-40 truncate text-[11px] text-guard-text-muted">
                  {email}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:hidden">
          <NavLinks orientation="horizontal" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-60 shrink-0 border-r border-guard-surface-raised p-4 lg:block">
          <NavLinks orientation="vertical" />
        </aside>
        <main id="contenido" className="min-w-0 flex-1 px-6 py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
