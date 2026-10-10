import { RefreshCw } from "lucide-react";
import {
  EMPTY_ANALYTICS,
  trustTone,
  type Overview,
  type ScanRecord,
} from "@mail-guard/contracts";
import ProfileMetric from "./ProfileMetric";
import SecurityDonutChart from "./SecurityDonutChart";
import SecurityPulseChart from "./SecurityPulseChart";

type ProfileViewProps = {
  email: string;
  overview: Overview | null;
  recentScans: ScanRecord[];
  isBusy: boolean;
  isRefreshing: boolean;
  dashboardUrl: string;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<unknown>;
};

const monthYear = new Intl.DateTimeFormat("es", {
  month: "short",
  year: "numeric",
});
const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function timeAgo(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

export default function ProfileView({
  email,
  overview,
  recentScans,
  isBusy,
  isRefreshing,
  dashboardUrl,
  onRefresh,
  onSignOut,
}: ProfileViewProps) {
  const profile = overview?.profile;
  const stats = overview?.analytics ?? EMPTY_ANALYTICS;
  const displayName =
    profile?.displayName?.trim() || email.split("@")[0] || "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase();
  const threats = stats.suspiciousScans + stats.dangerousScans;
  const hasScans = stats.totalScans > 0;
  const tone = trustTone(stats.averageTrustScore);

  return (
    <section className="relative flex flex-col gap-4 overflow-hidden pt-3">
      <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-guard-accent/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-guard-accent to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-guard-accent text-sm font-black text-guard-surface">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-guard-text-muted">¡Qué bueno verte!</p>
              <h1 className="truncate text-xl font-bold tracking-tight text-white">
                {displayName}
              </h1>
              <p className="text-[10px] text-guard-text-muted">
                {profile?.createdAt
                  ? `Miembro desde ${monthYear.format(new Date(profile.createdAt))}`
                  : "Miembro protegido"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isRefreshing}
            aria-label="Actualizar métricas"
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-guard-text-muted transition-colors hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${isRefreshing ? "animate-spin text-guard-accent" : ""}`}
              aria-hidden="true"
            />
            {isRefreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-guard-surface-raised/70 p-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-guard-text-muted">
              Último análisis
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {stats.lastScannedAt
                ? timeAgo(stats.lastScannedAt)
                : "Aún no has analizado correos"}
            </p>
          </div>
          {dashboardUrl && (
            <a
              href={`${dashboardUrl}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-guard-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-guard-accent transition-colors hover:bg-guard-accent/20"
            >
              Abrir panel web ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ProfileMetric
          label="Correos analizados"
          value={stats.totalScans}
          detail={hasScans ? "Historial guardado" : "Aún sin análisis"}
          variant="accent"
        />
        <ProfileMetric
          label="Amenazas detectadas"
          value={threats}
          detail={threats > 0 ? "Sospechosos o peligrosos" : "Sin incidentes"}
          variant={threats > 0 ? "warning" : "success"}
        />
        <ProfileMetric
          label="Confianza promedio"
          value={hasScans ? `${stats.averageTrustScore}%` : "—"}
          detail={
            !hasScans
              ? "Sin datos aún"
              : tone === "success"
                ? "Nivel excelente"
                : "Atención recomendada"
          }
          variant={!hasScans ? "default" : tone === "danger" ? "danger" : tone}
        />
        <ProfileMetric
          label="Enlaces revisados"
          value={stats.linksReviewed}
          detail="En todos tus análisis"
        />
      </div>

      <SecurityDonutChart
        safe={stats.safeScans}
        suspicious={stats.suspiciousScans}
        dangerous={stats.dangerousScans}
        unknown={stats.unknownScans}
        total={stats.totalScans}
      />

      <SecurityPulseChart
        scans={recentScans}
        averageScore={stats.averageTrustScore}
      />

      <div className="flex flex-col gap-2 pb-2 pt-1">
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={isBusy}
          className="h-11 cursor-pointer rounded-xl border border-white/5 bg-guard-surface-card text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
        <p className="truncate px-2 text-center text-[10px] text-guard-text-muted">
          {email}
        </p>
      </div>
    </section>
  );
}
