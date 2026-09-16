"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type FormFieldProps = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  onChange: (value: string) => void;
};

export default function FormField({
  id,
  label,
  type,
  placeholder,
  value,
  error,
  disabled,
  autoComplete,
  onChange,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold mb-2 text-guard-text-muted"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={`w-full bg-guard-surface-raised/80 backdrop-blur-md border outline-none text-white px-4 py-3 rounded-xl transition-all disabled:opacity-50 ${
            isPassword ? "pr-11" : ""
          } ${
            error
              ? "border-red-400/60 focus:border-red-400 focus:ring-1 focus:ring-red-400"
              : "border-guard-surface-raised focus:border-guard-accent focus:ring-1 focus:ring-guard-accent"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-guard-text-muted transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}
