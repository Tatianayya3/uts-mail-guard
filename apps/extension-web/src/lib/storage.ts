/**
 * Almacenamiento local tipado y tolerante a errores. El popup se cierra y se
 * vuelve a abrir constantemente, así que el estado de UI vive aquí.
 */
export function createStore<T>(
  key: string,
  validate: (value: unknown) => value is T,
) {
  return {
    read(): T | null {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const value: unknown = JSON.parse(raw);
        return validate(value) ? value : null;
      } catch {
        return null;
      }
    },
    write(value: T | null) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Almacenamiento lleno o bloqueado: la UI sigue funcionando sin persistir.
      }
    },
  };
}

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
