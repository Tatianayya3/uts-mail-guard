import type { AccountViewModel } from "../useAccountViewModel";
import AuthForm from "./AuthForm";
import ProfileView from "./ProfileView";

export default function AccountView({ vm }: { vm: AccountViewModel }) {
  if (vm.status === "loading") {
    return (
      <div
        className="flex min-h-96 flex-col items-center justify-center gap-3 text-center"
        role="status"
      >
        <span className="h-12 w-12 animate-spin rounded-full border-2 border-guard-accent/20 border-t-guard-accent" />
        <p className="text-xs text-guard-text-muted">
          Cargando tu cuenta y métricas...
        </p>
      </div>
    );
  }

  return vm.session ? (
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
  ) : (
    <AuthForm
      isBusy={vm.status === "busy"}
      onSignIn={vm.signIn}
      onSignUp={vm.signUp}
      onForgotPassword={vm.forgotPassword}
    />
  );
}
