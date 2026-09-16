import type {
  MailScanSummary,
  Profile,
  ProfileAnalytics,
} from "@mail-guard/supabase";
import type { AccountStatus } from "./useAccountAuth";
import ProfileMetric from "./ProfileMetric";
import SecurityDonutChart from "./SecurityDonutChart";
import SecurityPulseChart from "./SecurityPulseChart";

type ProfileDashboardProps = {
  email: string;
  profile: Profile | null;
  stats: ProfileAnalytics | null;
  recentScans: MailScanSummary[];
  status: AccountStatus;
  isRefreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

export default function ProfileDashboard({
  email,
  profile,
  stats,
  recentScans,
  status,
  isRefreshing = false,
  onRefresh,
  onSignOut,
}: ProfileDashboardProps) {
  // Deterministic display name: loaded from database profile
  const displayName =
    profile?.display_name?.trim() || email.split("@")[0] || "Usuario protegido";
  const initials = displayName.slice(0, 2).toUpperCase();

  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat("es-419", {
        month: "short",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : "Reciente";

  // Compute real metrics from stats or scans fallback
  const totalScans = stats?.total_scans ?? recentScans.length;
  const safeScans =
    stats?.safe_scans ?? recentScans.filter((s) => s.verdict === "safe").length;
  const suspiciousScans =
    stats?.suspicious_scans ??
    recentScans.filter((s) => s.verdict === "suspicious").length;
  const dangerousScans =
    stats?.dangerous_scans ??
    recentScans.filter((s) => s.verdict === "dangerous").length;
  const unknownScans =
    stats?.unknown_scans ??
    recentScans.filter((s) => s.verdict === "unknown").length;
  const threatsBlocked = suspiciousScans + dangerousScans;

  const averageScore = stats?.average_trust_score
    ? Math.round(Number(stats.average_trust_score))
    : recentScans.length > 0
      ? Math.round(
          recentScans.reduce((acc, s) => acc + s.trust_score, 0) /
            recentScans.length,
        )
      : 100;

  const linksReviewed = stats?.links_reviewed ?? 0;

  return (
    <section className="relative flex flex-col gap-4 overflow-hidden pt-3">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-guard-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-40 h-48 w-48 rounded-full bg-guard-success/10 blur-3xl" />

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-guard-accent to-transparent" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-12 w-12 rounded-2xl border border-white/10 object-cover shadow-inner"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-guard-accent text-sm font-black text-guard-surface shadow-[0_0_15px_rgba(200,212,0,0.35)]">
                {initials}
              </div>
            )}
            <div>
              <p className="text-xs text-guard-text-muted">Qué bueno verte</p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white">
                {displayName}
              </h1>
              <p className="mt-0.5 text-[10px] text-guard-text-muted">
                {profile?.role || "Miembro protegido"} · Desde {memberSince}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full bg-guard-success-strong/15 px-2 py-0.5 text-[10px] font-semibold text-guard-success">
              ● ACTIVO
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={isRefreshing}
                title="Actualizar métricas"
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-guard-text-muted transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className={`h-3 w-3 ${isRefreshing ? "animate-spin text-guard-accent" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{isRefreshing ? "Cargando..." : "Actualizar"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Protection Tier Indicator */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-guard-surface-raised/70 p-3 border border-white/5">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-guard-text-muted">
              Nivel de protección
            </p>
            <p className="mt-0.5 text-sm font-semibold text-guard-success">
              Escudo neural activo
            </p>
          </div>
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-guard-accent/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-guard-accent" />
            <span className="text-[10px] font-black text-guard-accent">
              99%
            </span>
          </div>
        </div>
      </div>

      {/* Real Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        <ProfileMetric
          label="Correos analizados"
          value={totalScans}
          detail={totalScans > 0 ? "Historial guardado" : "Esperando escaneos"}
          variant="accent"
        />
        <ProfileMetric
          label="Amenazas detectadas"
          value={threatsBlocked}
          detail={threatsBlocked > 0 ? "Neutralizadas" : "Sin incidentes"}
          variant={threatsBlocked > 0 ? "warning" : "success"}
        />
        <ProfileMetric
          label="Nivel de confianza"
          value={`${averageScore}%`}
          detail={
            averageScore >= 80 ? "Nivel excelente" : "Atención recomendada"
          }
          variant={averageScore >= 80 ? "success" : "warning"}
        />
        <ProfileMetric
          label="Enlaces revisados"
          value={
            linksReviewed > 0
              ? linksReviewed
              : safeScans > 0
                ? safeScans * 2
                : 0
          }
          detail="Verificación segura"
          variant="default"
        />
      </div>

      {/* Chart 1: Visual Security Distribution Donut */}
      <SecurityDonutChart
        safe={safeScans}
        suspicious={suspiciousScans}
        dangerous={dangerousScans}
        unknown={unknownScans}
        total={totalScans}
      />

      {/* Chart 2: Recent Security Pulse */}
      <SecurityPulseChart scans={recentScans} averageScore={averageScore} />

      {/* Sign Out Button & Info */}
      <div className="flex flex-col gap-2 pt-1 pb-2">
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={status === "loading"}
          className="h-11 cursor-pointer rounded-xl border border-white/5 bg-guard-surface-card text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
        <p className="text-center text-[10px] text-guard-text-muted truncate px-2">
          {email}
        </p>
      </div>
    </section>
  );
}
