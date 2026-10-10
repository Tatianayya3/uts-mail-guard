"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cuenta de 0 al valor al aparecer. Respeta «reducir movimiento» del sistema
 * y renderiza el valor final en el servidor (sin saltos ni texto vacío).
 */
export default function AnimatedNumber({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      from === value
    ) {
      setDisplay(value);
      return;
    }
    const duration = 700;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString("es")}
      {suffix}
    </span>
  );
}
