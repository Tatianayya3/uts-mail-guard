import { Gauge, Link2, Mail, ShieldAlert } from "lucide-react";
import {
  trustTone,
  type Analytics,
  type Profile,
  type ScanRecord,
} from "@mail-guard/contracts";
import DashboardInsights from "./DashboardInsights";
import DashboardTopbar from "./DashboardTopbar";
import Onboarding from "./Onboarding";
import StatCard from "./StatCard";
import {
  averageTrust,
  formatRelativeTime,
  periodDelta,
  scansInRange,
} from "./dashboard.utils";

type DashboardViewProps = {
  userEmail: string;
  profile: Profile;
  stats: Analytics;
  scans: ScanRecord[];
  error: string | null;
};

const number = (value: number) => value.toLocaleString("es");

export default function DashboardView({
  userEmail,
  profile,
  stats,
  scans,
  error,
}: DashboardViewProps) {
  const displayName =
    profile.displayName?.trim() || userEmail.split("@")[0] || "Usuario";
  const hasScans = stats.totalScans > 0;
  const threats = stats.suspiciousScans + stats.dangerousScans;
  const average = Math.round(stats.averageTrustScore);
  const week = periodDelta(scans, 7);
  const weekAverage = averageTrust(scansInRange(scans, 7));

  return (
    <div className="min-h-screen bg-guard-surface text-white">
      <DashboardTopbar
        displayName={displayName}
        email={userEmail}
        avatarUrl={profile.avatarUrl}
      />

      <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl">
            Hola, {displayName}
          </h1>
          <p
            className="mt-1 text-sm text-guard-text-muted"
            suppressHydrationWarning
          >
            {stats.lastScannedAt
              ? `Tu último análisis fue ${formatRelativeTime(stats.lastScannedAt)}.`
              : "Este es tu panel de seguridad."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
          >
            {error} Mostramos la información disponible; usa «Actualizar» para
            reintentar.
          </div>
        )}

        {!hasScans && !error && <Onboarding />}

        <section
          aria-label="Resumen histórico"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            icon={Mail}
            label="Correos analizados"
            value={number(stats.totalScans)}
            helper="en total"
            tone="accent"
            trend={
              week.delta !== 0
                ? { value: week.delta, label: "vs. semana anterior" }
                : undefined
            }
          />
          <StatCard
            icon={Gauge}
            label="Confianza promedio"
            value={hasScans ? `${average}%` : "—"}
            helper={
              weekAverage !== null
                ? `Últimos 7 días: ${weekAverage}%`
                : "Sin datos esta semana"
            }
            tone={hasScans ? trustTone(average) : "neutral"}
          />
          <StatCard
            icon={ShieldAlert}
            label="Amenazas detectadas"
            value={number(threats)}
            helper={`${number(stats.dangerousScans)} peligrosos · ${number(stats.suspiciousScans)} sospechosos`}
            tone={
              stats.dangerousScans > 0
                ? "danger"
                : threats > 0
                  ? "warning"
                  : "success"
            }
          />
          <StatCard
            icon={Link2}
            label="Enlaces revisados"
            value={number(stats.linksReviewed)}
            helper="en todos tus análisis"
            tone="neutral"
          />
        </section>

        {hasScans && (
          <DashboardInsights
            scans={scans}
            truncated={stats.totalScans > scans.length}
          />
        )}
      </main>
    </div>
  );
}
