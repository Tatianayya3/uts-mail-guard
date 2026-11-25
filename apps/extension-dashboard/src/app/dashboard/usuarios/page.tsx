import { ShieldCheck, UserRound, Users } from "lucide-react";
import UsersTable from "@/features/admin/UsersTable";
import ErrorBanner from "@/features/dashboard/ErrorBanner";
import PageHeader from "@/features/dashboard/PageHeader";
import StatCard from "@/features/dashboard/StatCard";
import {
  loadOverview,
  loadUsers,
  requireAdmin,
} from "@/features/dashboard/dashboard.data";

export const metadata = { title: "Usuarios | Mail Guard" };

export default async function UsersPage() {
  await requireAdmin();
  const [{ users, error }, { profile }] = await Promise.all([
    loadUsers(),
    loadOverview(),
  ]);
  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Todas las personas registradas. Los administradores ven las secciones del proyecto y pueden gestionar roles."
      />
      {error && <ErrorBanner message={error} />}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Registrados"
          value={users.length}
          tone="accent"
        />
        <StatCard
          icon={ShieldCheck}
          label="Administradores"
          value={admins}
          tone="success"
        />
        <StatCard
          icon={UserRound}
          label="Usuarios"
          value={users.length - admins}
        />
      </div>
      <UsersTable users={users} currentUserId={profile.id} />
    </>
  );
}
