import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

const VARIANT = {
  primary:
    "bg-guard-accent text-guard-surface shadow-[0_8px_24px_rgba(200,212,0,0.16)] hover:bg-guard-accent-bright",
  secondary:
    "border border-white/10 bg-guard-surface-card/60 text-white hover:border-guard-accent/30 hover:bg-white/5",
  ghost: "text-guard-text-muted hover:bg-white/5 hover:text-white",
  danger:
    "border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20",
} as const;

const SIZE = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-base",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  /** Muestra un spinner, deshabilita el botón y anuncia el estado ocupado. */
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-semibold transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guard-accent",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
