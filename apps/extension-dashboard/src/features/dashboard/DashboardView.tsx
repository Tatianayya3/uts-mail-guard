import { Gauge, Mail, ShieldCheck, ShieldX } from "lucide-react";
import type { Profile, ProfileAnalytics } from "@mail-guard/supabase";
import type { MailScanRecord } from "./dashboard.types";
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
  stats: ProfileAnalytics;
  scans: MailScanRecord[];
};

export default function DashboardView({
  userEmail,
  profile,
  stats,
  scans,
}: DashboardViewProps) {
  const greetingName = profile.display_name || userEmail.split("@")[0] || "ahí";
  const averageScore = Math.round(stats.average_trust_score);
  const safeRate = stats.total_scans
    ? Math.round((stats.safe_scans / stats.total_scans) * 100)
    : 100;

  const trustTrend = buildTrustTrend(scans);
  const dailyVolume = bucketScansByDay(scans);
  const verdictBreakdown = buildVerdictBreakdown(stats);

  const scoreTone =
    averageScore >= 80 ? "success" : averageScore >= 50 ? "warning" : "danger";

  return (
    <div className="min-h-screen bg-guard-surface text-white">
      <DashboardTopbar greetingName={greetingName} />

      <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl">Panel de seguridad</h1>
          <p className="mt-1 text-sm text-guard-text-muted">
            {stats.last_scanned_at
              ? `Último análisis ${formatRelativeTime(stats.last_scanned_at)}`
              : "Aún no tienes correos analizados"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Mail}
            label="Correos analizados"
            value={stats.total_scans.toLocaleString("es")}
            helper="Total histórico"
            tone="accent"
          />
          <StatCard
            icon={Gauge}
            label="Confianza promedio"
            value={`${averageScore}%`}
            helper="Sobre los últimos análisis"
            tone={scoreTone}
          />
          <StatCard
            icon={ShieldCheck}
            label="Tasa de correos seguros"
            value={`${safeRate}%`}
            helper={`${stats.safe_scans.toLocaleString("es")} correos seguros`}
            tone="success"
          />
          <StatCard
            icon={ShieldX}
            label="Correos peligrosos"
            value={stats.dangerous_scans.toLocaleString("es")}
            helper={
              stats.dangerous_scans > 0
                ? "Requieren tu atención"
                : "Ninguno detectado"
            }
            tone={stats.dangerous_scans > 0 ? "danger" : "neutral"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <TrustTrendChart data={trustTrend} />
          <VerdictDonutChart
            data={verdictBreakdown}
            total={stats.total_scans}
          />
          <ScansVolumeChart data={dailyVolume} />
          <RecentScansTable scans={scans} />
        </div>
      </main>
    </div>
  );
}
