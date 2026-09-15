import { useState } from "react";
import ScanTab from "@/components/tabs/scan/ScanTab";
import SharedHeader from "@/components/SharedHeader";
import TabNavigation, { AppTab } from "@/components/TabNavigation";
import AccountTab from "@/components/tabs/account/AccountTab";
import type { ScanResult } from "@/components/tabs/scan/scan.types";

const ACTIVE_TAB_KEY = "mail-guard-active-tab";
const SCAN_RESULT_KEY = "mail-guard-scan-result";

function readStoredTab(): AppTab {
  const storedTab = localStorage.getItem(ACTIVE_TAB_KEY);
  return storedTab === "account" ||
    storedTab === "signin" ||
    storedTab === "signup"
    ? "account"
    : "scan";
}

function readStoredScanResult(): ScanResult | null {
  const storedResult = localStorage.getItem(SCAN_RESULT_KEY);
  if (!storedResult) return null;

  try {
    return JSON.parse(storedResult) as ScanResult;
  } catch {
    localStorage.removeItem(SCAN_RESULT_KEY);
    return null;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(readStoredTab);
  const [scanResult, setScanResult] = useState<ScanResult | null>(
    readStoredScanResult,
  );
  const isAnalyzed = scanResult !== null;

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    localStorage.setItem(ACTIVE_TAB_KEY, tab);
  };

  const changeScanResult = (result: ScanResult | null) => {
    setScanResult(result);
    if (result) {
      localStorage.setItem(SCAN_RESULT_KEY, JSON.stringify(result));
    } else {
      localStorage.removeItem(SCAN_RESULT_KEY);
    }
  };

  return (
    <div className="flex min-h-150 w-100 flex-col overflow-hidden bg-guard-surface text-white gap-2">
      <SharedHeader />
      <main
        key={activeTab}
        className="min-h-0 flex-1 animate-fade-in px-5 pb-24"
      >
        {activeTab === "scan" && (
          <ScanTab
            isAnalyzed={isAnalyzed}
            scanResult={scanResult}
            onScanResultChange={changeScanResult}
          />
        )}
        {activeTab === "account" && <AccountTab />}
      </main>
      <TabNavigation activeTab={activeTab} onChange={changeTab} />
    </div>
  );
}
