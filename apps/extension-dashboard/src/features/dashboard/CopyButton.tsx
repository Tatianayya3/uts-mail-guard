"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export default function CopyButton({
  value,
  label = "Copiar",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) —
      // failing silently is fine, the value is still visible to select/copy.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-guard-text-muted transition-colors hover:bg-white/5 hover:text-white ${className}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-guard-success" strokeWidth={2.5} />
      ) : (
        <Copy className="h-3 w-3" strokeWidth={2.25} />
      )}
      {copied ? "Copiado" : label}
    </button>
  );
}
