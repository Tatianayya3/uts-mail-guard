import { useEffect } from "react";
import { Skeleton, Spinner } from "@mail-guard/ui";
import type { AccountViewModel } from "../useAccountViewModel";
import AuthForm from "./AuthForm";
import ProfileView from "./ProfileView";

export default function AccountView({ vm }: { vm: AccountViewModel }) {
  const { ensureFresh } = vm;
  // Carga perezosa: las métricas se piden al abrir esta pestaña.
  useEffect(() => ensureFresh(), [ensureFresh]);

  if (vm.status === "loading") {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-guard-accent">
        <Spinner className="h-8 w-8" label="Cargando tu cuenta" />
      </div>
    );
  }

  if (!vm.session) {
    return (
      <AuthForm
        isBusy={vm.status === "busy"}
        onSignIn={vm.signIn}
        onSignUp={vm.signUp}
        onForgotPassword={vm.forgotPassword}
      />
    );
  }

  if (!vm.overview) {
    return (
      <div
        className="flex flex-col gap-3 pt-3"
        role="status"
        aria-label="Cargando métricas"
      >
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-44" />
      </div>
    );
  }

  return (
    <ProfileView
      email={vm.session.user.email ?? ""}
      overview={vm.overview}
      recentScans={vm.recentScans}
      isBusy={vm.status === "busy"}
      isRefreshing={vm.isRefreshing}
      dashboardUrl={vm.dashboardUrl}
      onRefresh={vm.refresh}
      onSignOut={vm.signOut}
    />
  );
}
