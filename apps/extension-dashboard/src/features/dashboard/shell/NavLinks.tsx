"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bot,
  FlaskConical,
  GraduationCap,
  History,
  LayoutDashboard,
  Pickaxe,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@mail-guard/ui";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

/**
 * Grupos por rol: «Protección» y «Ayuda» son para todos; «Administración» y
 * «Proyecto de clase» solo aparecen a los admins. Ocultar el menú es solo
 * comodidad: cada página y cada servicio vuelven a comprobar el rol.
 */
const GROUPS: { title: string; adminOnly?: boolean; items: NavItem[] }[] = [
  {
    title: "Protección",
    items: [
      {
        href: "/dashboard",
        label: "Resumen",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/dashboard/historial", label: "Historial", icon: History },
      { href: "/dashboard/agentes", label: "Agentes IA", icon: Bot },
    ],
  },
  {
    title: "Administración",
    adminOnly: true,
    items: [{ href: "/dashboard/usuarios", label: "Usuarios", icon: Users }],
  },
  {
    title: "Proyecto de clase",
    adminOnly: true,
    items: [
      {
        href: "/dashboard/proyecto",
        label: "Entregables",
        icon: GraduationCap,
      },
      { href: "/dashboard/mineria", label: "Minería de datos", icon: Pickaxe },
      { href: "/dashboard/tests", label: "Pruebas", icon: FlaskConical },
    ],
  },
  {
    title: "Ayuda",
    items: [
      { href: "/dashboard/guia", label: "Guía de uso", icon: BookOpen },
      { href: "/dashboard/cuenta", label: "Cuenta", icon: UserCog },
    ],
  },
];

function NavLink({
  item,
  active,
  vertical,
}: {
  item: NavItem;
  active: boolean;
  vertical: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-guard-accent",
        vertical ? "h-9" : "h-9 whitespace-nowrap",
        active
          ? "bg-guard-accent/10 text-guard-accent"
          : "text-guard-text-muted hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/** Navegación del panel: columna agrupada en escritorio, pestañas en móvil. */
export default function NavLinks({
  orientation,
  isAdmin = false,
}: {
  orientation: "vertical" | "horizontal";
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const groups = GROUPS.filter((g) => isAdmin || !g.adminOnly);
  const vertical = orientation === "vertical";
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (!vertical) {
    return (
      <nav aria-label="Secciones del panel">
        <ul className="flex items-center gap-1 overflow-x-auto px-6 pb-2">
          {groups.map((group, g) => (
            <Fragment key={group.title}>
              {g > 0 && (
                <li
                  aria-hidden="true"
                  className="mx-1 h-5 w-px shrink-0 bg-guard-surface-raised"
                />
              )}
              {group.items.map((item) => (
                <li key={item.href} className="shrink-0">
                  <NavLink
                    item={item}
                    active={isActive(item)}
                    vertical={false}
                  />
                </li>
              ))}
            </Fragment>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Secciones del panel" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-guard-text-muted/70">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item)} vertical />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
