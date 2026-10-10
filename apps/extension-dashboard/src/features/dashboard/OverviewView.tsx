import Link from "next/link";
import { ArrowRight, Gauge, Link2, Mail, ShieldAlert } from "lucide-react";
import {
  trustTone,
  type Analytics,
  type ScanRecord,
} from "@mail-guard/contracts";
import AnimatedNumber from "./AnimatedNumber";
import DashboardInsights from "./DashboardInsights";
import ErrorBanner from "./ErrorBanner";
import Onboarding from "./Onboarding";
import PageHeader from "./PageHeader";
import StatCard from "./StatCard";
import {
  averageTrust,
  formatRelativeTime,
  periodDelta,
  scansInRange,
} from "./dashboard.utils";

type OverviewViewProps = {
  displayName: string;
  stats: Analytics;
  scans: ScanRecord[];
  error: string | null;
};

const number = (value: number) => value.toLocaleString("es");

export default function OverviewView({
  displayName,
  stats,
  scans,
  error,
}: OverviewViewProps) {
  const hasScans = stats.totalScans > 0;
  const threats = stats.suspiciousScans + stats.dangerousScans;
  const average = Math.round(stats.averageTrustScore);
  const week = periodDelta(scans, 7);
  const weekAverage = averageTrust(scansInRange(scans, 7));

  return (
    <>
      <PageHeader
        title={`Hola, ${displayName}`}
        description={
          stats.lastScannedAt
            ? `Tu último análisis fue ${formatRelativeTime(stats.lastScannedAt)}.`
            : "Este es tu panel de seguridad."
        }
        actions={
          hasScans && (
            <Link
              href="/dashboard/historial"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-guard-accent hover:text-guard-accent-bright"
            >
              Ver historial completo{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )
        }
      />

      {error && <ErrorBanner message={error} />}
      {!hasScans && !error && <Onboarding />}

      <section
        aria-label="Resumen histórico"
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          icon={Mail}
          label="Correos analizados"
          value={<AnimatedNumber value={stats.totalScans} />}
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
          value={hasScans ? <AnimatedNumber value={average} suffix="%" /> : "—"}
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
          value={<AnimatedNumber value={threats} />}
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
          value={<AnimatedNumber value={stats.linksReviewed} />}
          helper="en todos tus análisis"
        />
      </section>

      {hasScans && <DashboardInsights scans={scans} />}
    </>
  );
}
