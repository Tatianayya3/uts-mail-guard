import type { SignalStatus } from "@mail-guard/contracts";
import { SIGNAL_STATUS_LABEL } from "@mail-guard/contracts";

const STATUS_DOT: Record<SignalStatus, string> = {
  pass: "bg-guard-success",
  warning: "bg-amber-300",
  fail: "bg-red-400",
  unknown: "bg-guard-text-muted/50",
};

type SignalCardProps = {
  label: string;
  value: string;
  detail: string;
  status: SignalStatus;
};

export default function SignalCard({
  label,
  value,
  detail,
  status,
}: SignalCardProps) {
  return (
    <article className="min-h-19 rounded-lg bg-guard-surface-raised px-2.5 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-guard-text-muted">
          {label}
        </p>
        <span
          className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`}
          role="img"
          aria-label={SIGNAL_STATUS_LABEL[status]}
          title={SIGNAL_STATUS_LABEL[status]}
        />
      </div>
      <p className="mt-1 text-xs text-white">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-guard-text-muted">
        {detail}
      </p>
    </article>
  );
}
