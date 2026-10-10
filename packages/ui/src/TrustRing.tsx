import { VERDICT_COLOR, type Verdict } from "@mail-guard/contracts";
import { cn } from "./cn";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TrustRingProps = {
  score: number;
  verdict: Verdict;
  className?: string;
  caption?: string;
};

/** Anillo de confianza 0–100 coloreado por veredicto. */
export function TrustRing({
  score,
  verdict,
  className,
  caption = "Nivel de confianza",
}: TrustRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = VERDICT_COLOR[verdict];
  return (
    <div className={cn("relative h-40 w-40", className)}>
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${caption}: ${clamped} %`}
      >
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="7"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE}
          style={{
            transition:
              "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            filter: `drop-shadow(0 0 4px ${color}99)`,
          }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <p className="text-4xl font-bold leading-none text-white tabular-nums">
          {clamped}
          <span className="text-sm" style={{ color }}>
            %
          </span>
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-guard-text-muted">
          {caption}
        </p>
      </div>
    </div>
  );
}
