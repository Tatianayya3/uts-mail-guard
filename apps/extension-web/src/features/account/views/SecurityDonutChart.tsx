import {
  VERDICT_COLOR,
  VERDICT_LABEL,
  VERDICT_ORDER,
  type Verdict,
} from "@mail-guard/contracts";

type Props = Record<Verdict, number> & { total: number };

const RADIUS = 44;
const STROKE = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PLURAL: Record<Verdict, string> = {
  safe: "Seguros",
  suspicious: "Sospechosos",
  dangerous: "Peligrosos",
  unknown: VERDICT_LABEL.unknown,
};

function statusBadge(counts: Record<Verdict, number>) {
  if (counts.dangerous > 0)
    return {
      text: "Amenazas detectadas",
      className: "bg-red-500/15 text-red-400",
    };
  if (counts.suspicious > 0)
    return {
      text: "Atención requerida",
      className: "bg-amber-400/15 text-amber-300",
    };
  if (counts.unknown > 0)
    return {
      text: "Sin determinar",
      className: "bg-white/10 text-neutral-300",
    };
  return {
    text: "Todo en orden",
    className: "bg-guard-success-strong/15 text-guard-success",
  };
}

export default function SecurityDonutChart({ total, ...counts }: Props) {
  const hasData = total > 0;
  const percent = (value: number) =>
    hasData ? Math.round((value / total) * 100) : 0;
  const badge = statusBadge(counts);

  // Segmentos apilados: cada uno empieza donde terminó el anterior.
  let offset = 0;
  const segments = VERDICT_ORDER.filter((v) => counts[v] > 0).map((verdict) => {
    const length = (counts[verdict] / total) * CIRCUMFERENCE;
    const segment = { verdict, length, offset: -offset };
    offset += length;
    return segment;
  });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-guard-accent">
            Distribución de seguridad
          </p>
          <p className="text-xs text-guard-text-muted">
            {hasData ? `${total} análisis registrados` : "Sin análisis aún"}
          </p>
        </div>
        {hasData && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg
            className="h-full w-full -rotate-90"
            viewBox="0 0 110 110"
            role="img"
            aria-label="Distribución de veredictos"
          >
            <circle
              cx="55"
              cy="55"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE}
            />
            {segments.map((s) => (
              <circle
                key={s.verdict}
                cx="55"
                cy="55"
                r={RADIUS}
                fill="none"
                stroke={VERDICT_COLOR[s.verdict]}
                strokeWidth={STROKE}
                strokeDasharray={`${s.length} ${CIRCUMFERENCE}`}
                strokeDashoffset={s.offset}
                className="transition-all duration-700"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black leading-tight text-white">
              {hasData ? `${percent(counts.safe)}%` : "—"}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wide text-guard-text-muted">
              Seguro
            </span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col justify-center gap-1.5">
          {VERDICT_ORDER.map((verdict) => (
            <li
              key={verdict}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5 text-guard-text-muted">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: VERDICT_COLOR[verdict] }}
                />
                {PLURAL[verdict]}
              </span>
              <span className="font-semibold text-white">
                {counts[verdict]}{" "}
                <span className="text-[10px] font-normal text-guard-text-muted">
                  ({percent(counts[verdict])}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
