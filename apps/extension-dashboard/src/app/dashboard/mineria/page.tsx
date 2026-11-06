import MineriaView from "@/features/mineria/MineriaView";
import {
  loadMineria,
  loadMineriaGraficos,
} from "@/features/mineria/mineria.data";

export const metadata = { title: "Minería de datos | Mail Guard" };

export default async function MineriaPage() {
  const [{ data, error }, graficos] = await Promise.all([
    loadMineria(),
    loadMineriaGraficos(),
  ]);
  return <MineriaView data={data} error={error} graficos={graficos} />;
}
