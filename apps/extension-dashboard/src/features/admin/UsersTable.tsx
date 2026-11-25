"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { ROLE_LABEL, type AdminUser, type Role } from "@mail-guard/contracts";
import { Button, cn } from "@mail-guard/ui";
import { setUserRoleAction } from "@/features/dashboard/actions";
import EmptyChartState from "@/features/dashboard/EmptyChartState";
import {
  formatFullDate,
  formatRelativeTime,
} from "@/features/dashboard/dashboard.utils";

type Filter = "all" | Role;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Administradores" },
  { value: "user", label: "Usuarios" },
];

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        role === "admin"
          ? "border-guard-accent/30 bg-guard-accent/10 text-guard-accent"
          : "border-white/10 bg-white/5 text-guard-text-muted",
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function When({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-guard-text-muted">—</span>;
  return (
    <span title={formatFullDate(iso)} suppressHydrationWarning>
      {formatRelativeTime(iso)}
    </span>
  );
}

function RoleButton({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const next: Role = user.role === "admin" ? "user" : "admin";
  const change = () =>
    startTransition(async () => {
      const result = await setUserRoleAction(user.id, next);
      (result.ok ? toast.success : toast.error)(result.message);
    });

  if (isSelf)
    return <span className="text-[11px] text-guard-text-muted">Tú</span>;
  return (
    <Button
      size="sm"
      variant={next === "admin" ? "secondary" : "ghost"}
      loading={isPending}
      onClick={change}
      icon={
        next === "admin" ? (
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
        )
      }
    >
      {next === "admin" ? "Hacer admin" : "Quitar admin"}
    </Button>
  );
}

/** Lista de personas registradas con búsqueda, filtro por rol y cambio de rol. */
export default function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (filter === "all" || u.role === filter) &&
        (!q ||
          u.email?.toLowerCase().includes(q) ||
          u.displayName?.toLowerCase().includes(q)),
    );
  }, [users, query, filter]);

  const count = (role: Role) => users.filter((u) => u.role === role).length;

  return (
    <section className="rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filtrar por rol"
          className="flex gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value
                  ? "bg-guard-accent/15 text-guard-accent"
                  : "text-guard-text-muted hover:text-white",
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {f.value === "all" ? users.length : count(f.value)}
              </span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Buscar por nombre o correo</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-guard-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="h-9 w-full rounded-xl border border-white/10 bg-guard-surface/60 pr-3 pl-9 text-xs text-white placeholder:text-guard-text-muted focus:border-guard-accent/40 focus:outline-none"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyChartState
          icon={Users}
          className="h-40"
          title="Sin resultados"
          description="Nadie coincide con la búsqueda o el filtro."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-guard-text-muted">
              <tr>
                <th className="pb-2 font-medium">Persona</th>
                <th className="pb-2 font-medium">Rol</th>
                <th className="pb-2 text-right font-medium">Análisis</th>
                <th className="pb-2 text-right font-medium">Registro</th>
                <th className="pb-2 text-right font-medium">Último acceso</th>
                <th className="pb-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const label = u.displayName || u.email?.split("@")[0] || "—";
                return (
                  <tr key={u.id} className="border-t border-white/5">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white"
                        >
                          {label.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-white">
                            {label}
                          </span>
                          <span className="block truncate text-guard-text-muted">
                            {u.email ?? "Sin correo"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-white">
                      {u.totalScans}
                    </td>
                    <td className="py-2.5 text-right text-guard-text-muted">
                      <When iso={u.createdAt} />
                    </td>
                    <td className="py-2.5 text-right text-guard-text-muted">
                      <When iso={u.lastSignInAt} />
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <RoleButton user={u} isSelf={u.id === currentUserId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
