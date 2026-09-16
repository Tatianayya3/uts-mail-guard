import { useState } from "react";
import AuthForm from "./AuthForm";
import ProfileDashboard from "./ProfileDashboard";
import { useAccountAuth } from "./useAccountAuth";

type AuthMode = "signin" | "signup";

export default function AccountTab() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const {
    session,
    profile,
    stats,
    recentScans,
    status,
    isRefreshing,
    signIn,
    signUp,
    signOut,
    refreshStats,
  } = useAccountAuth();

  if (status === "loading" && !session) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-guard-accent/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-guard-accent" />
          <div className="h-2 w-2 rounded-full bg-guard-accent animate-pulse" />
        </div>
        <p className="text-xs text-guard-text-muted">
          Cargando tu escudo y métricas...
        </p>
      </div>
    );
  }

  if (session) {
    return (
      <ProfileDashboard
        email={session.user.email ?? ""}
        profile={profile}
        stats={stats}
        recentScans={recentScans}
        status={status}
        isRefreshing={isRefreshing}
        onRefresh={refreshStats}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AuthForm
      mode={mode}
      status={status}
      onModeChange={setMode}
      onSignIn={signIn}
      onSignUp={signUp}
    />
  );
}
