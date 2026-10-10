import DashboardShell from "@/features/dashboard/shell/DashboardShell";
import { loadOverview } from "@/features/dashboard/dashboard.data";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const { email, profile } = await loadOverview();
  const displayName =
    profile.displayName?.trim() || email.split("@")[0] || "Usuario";
  return (
    <DashboardShell
      displayName={displayName}
      email={email}
      avatarUrl={profile.avatarUrl}
    >
      {children}
    </DashboardShell>
  );
}
