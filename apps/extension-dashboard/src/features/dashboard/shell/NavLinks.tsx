"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FlaskConical,
  History,
  LayoutDashboard,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@mail-guard/ui";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/historial", label: "Historial", icon: History },
  { href: "/dashboard/cuenta", label: "Cuenta", icon: UserCog },
  { href: "/dashboard/guia", label: "Guía", icon: BookOpen },
  { href: "/dashboard/tests", label: "Pruebas", icon: FlaskConical },
];

/** Navegación del panel: columna en escritorio, pestañas desplazables en móvil. */
export default function NavLinks({
  orientation,
}: {
  orientation: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <nav aria-label="Secciones del panel">
      <ul
        className={cn(
          "flex gap-1",
          vertical ? "flex-col" : "overflow-x-auto px-6 pb-2",
        )}
      >
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-guard-accent",
                  vertical ? "h-10" : "h-9",
                  active
                    ? "bg-guard-accent/10 text-guard-accent"
                    : "text-guard-text-muted hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon
                  className="h-4 w-4"
                  strokeWidth={2.25}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
