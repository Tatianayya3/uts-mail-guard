"use client";

import { useEffect, useState } from "react";
import { VERDICT_COLOR, type Verdict } from "@mail-guard/contracts";
import { cn } from "./cn";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION_MS = 1100;

type TrustRingProps = {
  score: number;
  verdict: Verdict;
  className?: string;
  caption?: string;
};

/** Cuenta de 0 al valor con easing; respeta «reducir movimiento». */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

/** Anillo de confianza 0–100 coloreado por veredicto, que se dibuja al aparecer. */
export function TrustRing({
  score,
  verdict,
  className,
  caption = "Nivel de confianza",
}: TrustRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const shown = useCountUp(clamped);
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
          strokeDashoffset={CIRCUMFERENCE - (shown / 100) * CIRCUMFERENCE}
          style={{ filter: `drop-shadow(0 0 4px ${color}99)` }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <p className="text-4xl font-bold leading-none text-white tabular-nums">
          {shown}
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
