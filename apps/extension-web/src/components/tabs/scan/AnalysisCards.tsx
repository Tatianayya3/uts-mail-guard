type SignalCardProps = {
  label: string;
  value: string;
  detail: string;
  status?: "pass" | "warning" | "fail" | "unknown";
};

export function SignalCard({
  label,
  value,
  detail,
  status = "unknown",
}: SignalCardProps) {
  const statusColor = {
    pass: "bg-guard-success",
    warning: "bg-amber-300",
    fail: "bg-red-400",
    unknown: "bg-guard-text-muted/50",
  }[status];

  return (
    <article className="min-h-19 rounded-lg bg-guard-surface-raised px-2 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-guard-text-muted">
          {label}
        </p>

        <span className={`h-2 w-2 rounded-full ${statusColor}`} />
      </div>
      <p className="mt-1 text-xs text-white">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-guard-text-muted">
        {detail}
      </p>
    </article>
  );
}

type StatCardProps = {
  value: string;
  label: string;
  accent?: boolean;
};

export function StatCard({ value, label, accent = false }: StatCardProps) {
  return (
    <div className="rounded-xl bg-black/10 py-3 text-center">
      <p className={accent ? "font-bold text-guard-success" : "font-bold"}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-guard-text-muted">{label}</p>
    </div>
  );
}
