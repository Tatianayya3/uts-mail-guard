import type { CSSProperties } from "react";

type TrustScoreRingProps = {
  score: number;
  verdict: "safe" | "suspicious" | "dangerous" | "unknown";
};

const verdictTheme = {
  safe: {
    color: "#4EDEA3",
    glow: "rgba(78,222,163,0.72)",
  },
  suspicious: {
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.72)",
  },
  dangerous: {
    color: "#FF5C5C",
    glow: "rgba(255,92,92,0.78)",
  },
  unknown: {
    color: "#a3a3a3",
    glow: "rgba(163,163,163,0.42)",
  },
};

export default function TrustScoreRing({
  score,
  verdict,
}: TrustScoreRingProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress =
    circumference - (Math.max(0, Math.min(score, 100)) / 100) * circumference;

  return (
    <div
      className="score-ring relative h-40 w-40"
      style={
        {
          "--score-color": verdictTheme[verdict].color,
          "--score-glow": verdictTheme[verdict].glow,
        } as CSSProperties
      }
    >
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 120 120"
        aria-label={`Nivel de confianza ${score}%`}
        role="img"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="7"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={verdictTheme[verdict].color}
          strokeLinecap="round"
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className="trust-score-progress"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold leading-none">
          {score}
          <span
            className="text-sm"
            style={{ color: verdictTheme[verdict].color }}
          >
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
