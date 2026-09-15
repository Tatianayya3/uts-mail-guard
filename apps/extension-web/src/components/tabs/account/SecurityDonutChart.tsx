type SecurityDonutChartProps = {
  safe: number;
  suspicious: number;
  dangerous: number;
  unknown?: number;
  total: number;
};

export default function SecurityDonutChart({
  safe,
  suspicious,
  dangerous,
  unknown = 0,
  total,
}: SecurityDonutChartProps) {
  const radius = 44;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;

  const hasData = total > 0;
  const safePercent = hasData ? Math.round((safe / total) * 100) : 100;
  const suspiciousPercent = hasData
    ? Math.round((suspicious / total) * 100)
    : 0;
  const dangerousPercent = hasData ? Math.round((dangerous / total) * 100) : 0;
  const unknownPercent = hasData ? Math.round((unknown / total) * 100) : 0;

  // Lengths in circumference
  const safeLength = hasData ? (safe / total) * circumference : circumference;
  const suspiciousLength = hasData ? (suspicious / total) * circumference : 0;
  const dangerousLength = hasData ? (dangerous / total) * circumference : 0;
  const unknownLength = hasData ? (unknown / total) * circumference : 0;

  // Dash offsets for stacking segments: Safe -> Suspicious -> Dangerous -> Unknown
  const safeOffset = 0;
  const suspiciousOffset = -safeLength;
  const dangerousOffset = -(safeLength + suspiciousLength);
  const unknownOffset = -(safeLength + suspiciousLength + dangerousLength);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-guard-accent">
            DISTRIBUCIÓN DE SEGURIDAD
          </p>
          <p className="text-xs text-guard-text-muted">
            {hasData ? `${total} análisis registrados` : "Sin análisis aún"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            dangerous > 0
              ? "bg-red-500/15 text-red-400"
              : suspicious > 0
                ? "bg-amber-400/15 text-amber-300"
                : unknown > 0
                  ? "bg-white/10 text-neutral-300"
                  : "bg-guard-success-strong/15 text-guard-success"
          }`}
        >
          {dangerous > 0
            ? "Amenazas detectadas"
            : suspicious > 0
              ? "Atención requerida"
              : unknown > 0
                ? "Sin determinar"
                : "100% Protegido"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        {/* SVG Donut */}
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 110 110">
            {/* Background base ring */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
            />

            {!hasData ? (
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke="#4edea3"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference * 0.9} ${circumference * 0.1}`}
                opacity="0.3"
              />
            ) : (
              <>
                {/* Safe segment */}
                {safe > 0 && (
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="none"
                    stroke="#4edea3"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${safeLength} ${circumference}`}
                    strokeDashoffset={safeOffset}
                    strokeLinecap={
                      suspicious === 0 && dangerous === 0 && unknown === 0
                        ? "round"
                        : "butt"
                    }
                    className="transition-all duration-700"
                  />
                )}

                {/* Suspicious segment */}
                {suspicious > 0 && (
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${suspiciousLength} ${circumference}`}
                    strokeDashoffset={suspiciousOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-700"
                  />
                )}

                {/* Dangerous segment */}
                {dangerous > 0 && (
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="none"
                    stroke="#ff5c5c"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dangerousLength} ${circumference}`}
                    strokeDashoffset={dangerousOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-700"
                  />
                )}

                {/* Unknown / Sin determinar segment */}
                {unknown > 0 && (
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="none"
                    stroke="#a3a3a3"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${unknownLength} ${circumference}`}
                    strokeDashoffset={unknownOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-700"
                  />
                )}
              </>
            )}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black leading-tight text-white">
              {hasData ? `${safePercent}%` : "100%"}
            </span>
            <span className="text-[9px] font-medium tracking-wide text-guard-text-muted uppercase">
              SEGURO
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-guard-text-muted">
              <span className="h-2 w-2 rounded-full bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.5)]" />
              Seguros
            </span>
            <span className="font-semibold text-white">
              {safe}{" "}
              <span className="text-[10px] text-guard-text-muted font-normal">
                ({safePercent}%)
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-guard-text-muted">
              <span className="h-2 w-2 rounded-full bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              Sospechosos
            </span>
            <span className="font-semibold text-white">
              {suspicious}{" "}
              <span className="text-[10px] text-guard-text-muted font-normal">
                ({suspiciousPercent}%)
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-guard-text-muted">
              <span className="h-2 w-2 rounded-full bg-[#ff5c5c] shadow-[0_0_8px_rgba(255,92,92,0.5)]" />
              Peligrosos
            </span>
            <span className="font-semibold text-white">
              {dangerous}{" "}
              <span className="text-[10px] text-guard-text-muted font-normal">
                ({dangerousPercent}%)
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-guard-text-muted">
              <span className="h-2 w-2 rounded-full bg-[#a3a3a3] shadow-[0_0_8px_rgba(163,163,163,0.4)]" />
              Sin determinar
            </span>
            <span className="font-semibold text-white">
              {unknown}{" "}
              <span className="text-[10px] text-guard-text-muted font-normal">
                ({unknownPercent}%)
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
