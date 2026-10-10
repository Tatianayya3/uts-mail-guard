import type { ReactNode } from "react";
import { ScanSearch, UserRound } from "lucide-react";

export type AppTab = "scan" | "account";

type TabNavigationProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { id: AppTab; label: string; icon: ReactNode }[] = [
  {
    id: "scan",
    label: "Escanear",
    icon: <ScanSearch className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: "account",
    label: "Cuenta",
    icon: <UserRound className="h-5 w-5" aria-hidden="true" />,
  },
];

export default function TabNavigation({
  activeTab,
  onChange,
}: TabNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-2 border-t border-white/10 bg-guard-surface-raised/90 px-4 pb-3 pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl"
      aria-label="Navegación principal"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`relative flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[12px] font-medium transition-colors ${activeTab === tab.id ? "bg-guard-accent/10 text-guard-accent" : "text-guard-text-muted hover:bg-white/5"}`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
