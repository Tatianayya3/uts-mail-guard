type Level = "debug" | "info" | "warn" | "error";

export type Logger = Record<
  Level,
  (event: string, data?: Record<string, unknown>) => void
>;

/** Logs JSON de una línea: fáciles de leer en Docker y de indexar. */
export function createLogger(service: string): Logger {
  const write =
    (level: Level) => (event: string, data?: Record<string, unknown>) => {
      if (level === "debug" && !process.env.DEBUG) return;
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        service,
        event,
        ...data,
      });
      (level === "error" ? console.error : console.log)(line);
    };
  return {
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
  };
}
