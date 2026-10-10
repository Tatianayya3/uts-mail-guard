"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Primer mensaje de error por campo a partir de un ZodError. */
export function fieldErrors<T>(error: z.ZodError): FieldErrors<T> {
  const errors: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof T | undefined;
    if (field !== undefined && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/**
 * Estado de formulario validado con los mismos schemas Zod que usa el
 * backend. Muestra el error bajo cada campo y lo limpia al escribir.
 * Reemplaza la lógica que antes se repetía en cada formulario.
 */
export function useZodForm<S extends z.ZodType<Record<string, unknown>>>(
  schema: S,
  initialValues: z.input<S>,
) {
  type Values = z.input<S>;
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<Values>>({});

  const setValue = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues(
      (current) => ({ ...(current as object), [field]: value }) as Values,
    );
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const handleSubmit =
    (onValid: (data: z.output<S>) => unknown | Promise<unknown>) =>
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const result = schema.safeParse(values);
      if (!result.success) {
        setErrors(fieldErrors<Values>(result.error));
        return;
      }
      setErrors({});
      void onValid(result.data);
    };

  /** Props listas para un <TextField>. */
  const field = <K extends keyof Values & string>(name: K) => ({
    name,
    value: String(values[name] ?? ""),
    onValueChange: (value: string) => setValue(name, value as Values[K]),
    error: errors[name],
  });

  return {
    values,
    errors,
    setValue,
    field,
    handleSubmit,
    reset: () => {
      setValues(initialValues);
      setErrors({});
    },
  };
}
