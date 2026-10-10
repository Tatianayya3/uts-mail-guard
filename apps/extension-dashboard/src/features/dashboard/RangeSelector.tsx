"use client";

import { RANGE_OPTIONS, type RangeDays } from "./dashboard.utils";

type RangeSelectorProps = {
  value: RangeDays;
  onChange: (value: RangeDays) => void;
};

export default function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Periodo de análisis"
      className="inline-flex rounded-xl border border-guard-surface-raised bg-guard-surface-card/60 p-1"
    >
      {RANGE_OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          role="radio"
          aria-checked={value === days}
          onClick={() => onChange(days)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-guard-accent ${
            value === days
              ? "bg-guard-accent text-guard-surface"
              : "text-guard-text-muted hover:text-white"
          }`}
        >
          {days} días
        </button>
      ))}
    </div>
  );
}
