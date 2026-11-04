import MineriaView from "@/features/mineria/MineriaView";
import { loadMineria } from "@/features/mineria/mineria.data";

export const metadata = { title: "Minería de datos | Mail Guard" };

export default async function MineriaPage() {
  const { data, error } = await loadMineria();
  return <MineriaView data={data} error={error} />;
}
