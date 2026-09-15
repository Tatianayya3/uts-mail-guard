export type AppTab = "scan" | "account";

type TabNavigationProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: { id: AppTab; label: string }[] = [
  { id: "scan", label: "Escanear" },
  { id: "account", label: "Cuenta" },
];

export default function TabNavigation({
  activeTab,
  onChange,
}: TabNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-2 border-t border-white/10 bg-guard-surface-raised/90 px-4 pb-3 pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`relative flex h-11 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${activeTab === tab.id ? "bg-guard-accent/10 text-guard-accent" : "text-guard-text-muted hover:bg-white/5"}`}
        >
          {/* TODO: Reemplazar este espacio por el icono de navegación. */}
          <span className="h-4 w-4" />
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-guard-accent" />
          )}
        </button>
      ))}
    </nav>
  );
}
