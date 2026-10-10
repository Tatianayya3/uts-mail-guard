import ScanDetail from "@/features/dashboard/ScanDetail";
import { loadScan } from "@/features/dashboard/dashboard.data";

export async function generateMetadata(
  props: PageProps<"/dashboard/historial/[id]">,
) {
  const { id } = await props.params;
  const scan = await loadScan(id);
  return { title: `${scan.subject || "Análisis"} | Mail Guard` };
}

export default async function ScanPage(
  props: PageProps<"/dashboard/historial/[id]">,
) {
  const { id } = await props.params;
  return <ScanDetail scan={await loadScan(id)} />;
}
