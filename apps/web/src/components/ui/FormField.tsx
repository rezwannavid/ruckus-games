import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormField({ label, error, hint, id, className = "", ...props }: FormFieldProps) {
  const fieldId = id ?? props.name;
  const messageId = fieldId ? `${fieldId}-message` : undefined;

  return (
    <label className="block" htmlFor={fieldId}>
      <span className="text-footnote-semibold">{label}</span>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={`mt-2 h-16 w-full rounded-[var(--radius-lg)] border-2 border-transparent bg-[var(--surface-inverted-light)] px-5 text-headline-md-semibold text-[var(--text-inverted-plus)] outline-none placeholder:text-[var(--text-inverted)]/35 focus:border-[var(--surface-primary)] disabled:opacity-50 ${className}`}
        {...props}
      />
      {(error || hint) && (
        <span
          id={messageId}
          className={`mt-2 block text-footnote-semibold ${error ? "text-[var(--danger)]" : "opacity-60"}`}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}
