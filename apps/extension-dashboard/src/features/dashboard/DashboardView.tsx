import { Gauge, Mail, ShieldCheck, ShieldX } from "lucide-react";
import {
  trustTone,
  type Analytics,
  type Profile,
  type ScanRecord,
} from "@mail-guard/contracts";
import DashboardTopbar from "./DashboardTopbar";
import StatCard from "./StatCard";
import TrustTrendChart from "./TrustTrendChart";
import VerdictDonutChart from "./VerdictDonutChart";
import ScansVolumeChart from "./ScansVolumeChart";
import RecentScansTable from "./RecentScansTable";
import {
  bucketScansByDay,
  buildTrustTrend,
  buildVerdictBreakdown,
  formatRelativeTime,
} from "./dashboard.utils";

type DashboardViewProps = {
  userEmail: string;
  profile: Profile;
  stats: Analytics;
  scans: ScanRecord[];
  error: string | null;
};

export default function DashboardView({
  userEmail,
  profile,
  stats,
  scans,
  error,
}: DashboardViewProps) {
  const greetingName = profile.displayName || userEmail.split("@")[0] || "ahí";
  const averageScore = Math.round(stats.averageTrustScore);
  const safeRate = stats.totalScans
    ? Math.round((stats.safeScans / stats.totalScans) * 100)
    : 0;

  const trustTrend = buildTrustTrend(scans);
  const dailyVolume = bucketScansByDay(scans);
  const verdictBreakdown = buildVerdictBreakdown(stats);

  const scoreTone = stats.totalScans ? trustTone(averageScore) : "neutral";

  return (
    <div className="min-h-screen bg-guard-surface text-white">
      <DashboardTopbar greetingName={greetingName} />

      <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl">Panel de seguridad</h1>
          <p className="mt-1 text-sm text-guard-text-muted">
            {stats.lastScannedAt
              ? `Último análisis ${formatRelativeTime(stats.lastScannedAt)}`
              : "Aún no tienes correos analizados"}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
          >
            {error} Mostramos la información disponible.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Mail}
            label="Correos analizados"
            value={stats.totalScans.toLocaleString("es")}
            helper="Total histórico"
            tone="accent"
          />
          <StatCard
            icon={Gauge}
            label="Confianza promedio"
            value={stats.totalScans ? `${averageScore}%` : "—"}
            helper="Sobre los últimos análisis"
            tone={scoreTone}
          />
          <StatCard
            icon={ShieldCheck}
            label="Tasa de correos seguros"
            value={`${safeRate}%`}
            helper={`${stats.safeScans.toLocaleString("es")} correos seguros`}
            tone="success"
          />
          <StatCard
            icon={ShieldX}
            label="Correos peligrosos"
            value={stats.dangerousScans.toLocaleString("es")}
            helper={
              stats.dangerousScans > 0
                ? "Requieren tu atención"
                : "Ninguno detectado"
            }
            tone={stats.dangerousScans > 0 ? "danger" : "neutral"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <TrustTrendChart data={trustTrend} />
          <VerdictDonutChart data={verdictBreakdown} total={stats.totalScans} />
          <ScansVolumeChart data={dailyVolume} />
          <RecentScansTable scans={scans} />
        </div>
      </main>
    </div>
  );
}
