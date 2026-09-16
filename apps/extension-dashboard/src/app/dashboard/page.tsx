import { redirect } from "next/navigation";
import { DashboardView } from "@/features/dashboard";
import { getServerDashboardData, getServerUser } from "@/utils/supabase/server";

export const metadata = {
  title: "Panel | Mail Guard",
};

export default async function DashboardPage() {
  const { user } = await getServerUser();
  if (!user) redirect("/");

  const { profile, stats, scans } = await getServerDashboardData(user);

  return (
    <DashboardView
      userEmail={user.email ?? ""}
      profile={profile}
      stats={stats}
      scans={scans}
    />
  );
}
