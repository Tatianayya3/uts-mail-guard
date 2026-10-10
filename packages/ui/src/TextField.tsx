"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "./cn";

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "size"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  hint?: string;
  size?: "sm" | "md";
};

/** Campo con etiqueta, error accesible (aria-invalid/describedby) y ojo para contraseñas. */
export function TextField({
  label,
  value,
  onValueChange,
  error,
  hint,
  size = "md",
  type = "text",
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "font-semibold text-guard-text-muted",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            "w-full border bg-guard-surface/60 text-white outline-none transition-colors placeholder:text-guard-text-muted/60 disabled:opacity-50",
            size === "sm"
              ? "h-11 rounded-xl px-3 text-sm"
              : "h-12 rounded-xl px-4 text-base",
            isPassword && "pr-11",
            error
              ? "border-red-400/60 focus:border-red-300"
              : "border-white/10 focus:border-guard-accent",
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={revealed}
            disabled={props.disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-guard-text-muted transition-colors hover:text-white disabled:cursor-not-allowed"
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn(
            "text-xs",
            error ? "text-red-300" : "text-guard-text-muted",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
