import type { CSSProperties } from "react";
import { VERDICT_COLOR, type Verdict } from "@mail-guard/contracts";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TrustScoreRing({
  score,
  verdict,
}: {
  score: number;
  verdict: Verdict;
}) {
  const color = VERDICT_COLOR[verdict];
  const offset =
    CIRCUMFERENCE - (Math.max(0, Math.min(score, 100)) / 100) * CIRCUMFERENCE;

  return (
    <div
      className="relative h-40 w-40"
      style={
        {
          "--score-color": color,
          "--score-glow": `${color}b8`,
        } as CSSProperties
      }
    >
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Nivel de confianza ${score} %`}
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
          strokeDashoffset={offset}
          className="trust-score-progress"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold leading-none">
          {score}
          <span className="text-sm" style={{ color }}>
            %
          </span>
        </p>
        <p className="mt-1 text-[10px] tracking-wide text-guard-text-muted">
          NIVEL DE CONFIANZA
        </p>
      </div>
    </div>
  );
}
