import { useState } from "react";
import { Toaster } from "sonner";
import AccountView from "@/features/account/views/AccountView";
import { useAccountViewModel } from "@/features/account/useAccountViewModel";
import ScanView from "@/features/scan/views/ScanView";
import { useScanViewModel } from "@/features/scan/useScanViewModel";
import { createStore } from "@/lib/storage";
import AppHeader from "./AppHeader";
import TabNavigation, { type AppTab } from "./TabNavigation";

const tabStore = createStore<AppTab>(
  "mail-guard-active-tab",
  (v): v is AppTab => v === "scan" || v === "account",
);

export default function App() {
  const [tab, setTab] = useState<AppTab>(() => tabStore.read() ?? "scan");
  // Los ViewModels viven aquí para conservar su estado al cambiar de pestaña.
  const scan = useScanViewModel();
  const account = useAccountViewModel();

  const changeTab = (next: AppTab) => {
    setTab(next);
    tabStore.write(next);
  };

  return (
    <div className="flex min-h-150 w-100 flex-col gap-2 overflow-hidden bg-guard-surface text-white">
      <AppHeader signedIn={Boolean(account.session)} />
      <main key={tab} className="min-h-0 flex-1 animate-fade-in px-5 pb-24">
        {tab === "scan" ? <ScanView vm={scan} /> : <AccountView vm={account} />}
      </main>
      <TabNavigation activeTab={tab} onChange={changeTab} />
      <Toaster
        theme="dark"
        position="top-center"
        offset={12}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex items-start gap-2 w-full rounded-xl border px-3.5 py-3 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl",
            title: "font-bold leading-4",
            description: "text-[11px] leading-4 opacity-80",
            default:
              "bg-guard-surface-raised/95 border-guard-surface-card text-white",
            success:
              "bg-guard-surface-raised/95 border-guard-success-strong/40 text-guard-success",
            error: "bg-guard-surface-raised/95 border-red-400/40 text-red-200",
            warning:
              "bg-guard-surface-raised/95 border-amber-300/40 text-amber-200",
            info: "bg-guard-surface-raised/95 border-guard-accent/40 text-guard-accent-bright",
          },
        }}
      />
    </div>
  );
}
