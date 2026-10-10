import AccountSettings from "@/features/dashboard/account/AccountSettings";
import ErrorBanner from "@/features/dashboard/ErrorBanner";
import PageHeader from "@/features/dashboard/PageHeader";
import { loadOverview, loadScans } from "@/features/dashboard/dashboard.data";

export const metadata = { title: "Cuenta | Mail Guard" };

const monthYear = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

export default async function AccountPage() {
  const [overview, { scans }] = await Promise.all([
    loadOverview(),
    loadScans(),
  ]);
  const since = overview.profile.createdAt
    ? `Miembro desde ${monthYear.format(new Date(overview.profile.createdAt))}.`
    : undefined;
  return (
    <>
      <PageHeader title="Cuenta" description={since} />
      {overview.error && <ErrorBanner message={overview.error} />}
      <AccountSettings
        email={overview.email}
        profile={overview.profile}
        scans={scans}
        totalScans={overview.analytics.totalScans}
      />
    </>
  );
}
