import ErrorBanner from "@/features/dashboard/ErrorBanner";
import HistoryTable from "@/features/dashboard/HistoryTable";
import PageHeader from "@/features/dashboard/PageHeader";
import { loadOverview, loadScans } from "@/features/dashboard/dashboard.data";

export const metadata = { title: "Historial | Mail Guard" };

export default async function HistoryPage() {
  const [{ analytics }, { scans, error }] = await Promise.all([
    loadOverview(),
    loadScans(),
  ]);
  return (
    <>
      <PageHeader
        title="Historial"
        description="Todos tus correos analizados. Selecciona uno para ver el detalle."
      />
      {error && <ErrorBanner message={error} />}
      <HistoryTable
        scans={scans}
        truncated={analytics.totalScans > scans.length}
      />
    </>
  );
}
