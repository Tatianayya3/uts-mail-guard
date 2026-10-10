import OverviewView from "@/features/dashboard/OverviewView";
import { loadOverview, loadScans } from "@/features/dashboard/dashboard.data";

export const metadata = { title: "Resumen | Mail Guard" };

export default async function DashboardPage() {
  const [overview, history] = await Promise.all([loadOverview(), loadScans()]);
  const displayName =
    overview.profile.displayName?.trim() ||
    overview.email.split("@")[0] ||
    "Usuario";
  return (
    <OverviewView
      displayName={displayName}
      stats={overview.analytics}
      scans={history.scans}
      error={overview.error ?? history.error}
    />
  );
}
