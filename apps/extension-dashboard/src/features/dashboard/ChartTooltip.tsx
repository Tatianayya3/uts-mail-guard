type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
  unit?: string;
};

export default function ChartTooltip({
  active,
  label,
  payload,
  unit = "",
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-guard-surface/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      {label && (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-guard-text-muted">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div
            key={`${entry.name}-${index}`}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-guard-text-muted">{entry.name}</span>
            <span className="ml-auto font-semibold text-white">
              {entry.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
