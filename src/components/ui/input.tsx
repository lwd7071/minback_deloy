import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-label">{label}</span>
      {hint ? <span className="form-label-hint">{hint}</span> : null}
      <input
        className="input"
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error ? (
        <span className="form-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
