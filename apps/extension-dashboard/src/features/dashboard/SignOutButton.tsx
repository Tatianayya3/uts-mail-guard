"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth } from "@/utils/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isLoading}
      className="flex items-center gap-2 rounded-xl border border-guard-surface-raised bg-guard-surface-card/60 px-3.5 py-2 text-xs font-semibold text-guard-text-muted transition-colors hover:border-red-300/30 hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
      {isLoading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
