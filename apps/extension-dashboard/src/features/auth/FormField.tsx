type FormFieldProps = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  error?: string;
  disabled?: boolean;
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
  onChange,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold mb-2 text-guard-text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`w-full bg-guard-surface-raised/80 backdrop-blur-md border outline-none text-white px-4 py-3 rounded-xl transition-all disabled:opacity-50 ${
          error
            ? "border-red-400/60 focus:border-red-400 focus:ring-1 focus:ring-red-400"
            : "border-guard-surface-raised focus:border-guard-accent focus:ring-1 focus:ring-guard-accent"
        }`}
      />
      {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}
