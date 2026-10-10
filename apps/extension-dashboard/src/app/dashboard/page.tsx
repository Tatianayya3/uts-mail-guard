import { redirect } from "next/navigation";
import { DashboardView } from "@/features/dashboard";
import { loadDashboardData } from "@/features/dashboard/dashboard.data";
import { getServerSession } from "@/lib/supabase/server";

export const metadata = {
  title: "Panel | Mail Guard",
};

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/");

  const { profile, analytics, scans, error } = await loadDashboardData(
    session.user,
    session.accessToken,
  );

  return (
    <DashboardView
      userEmail={session.user.email ?? ""}
      profile={profile}
      stats={analytics}
      scans={scans}
      error={error}
    />
  );
}
