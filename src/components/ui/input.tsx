import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  hint,
  error,
  success,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  success?: boolean;
}) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-label">{label}</span>
      {hint ? <span className="form-label-hint">{hint}</span> : null}
      <input
        className={`input ${error ? "input-error" : ""} ${success ? "input-success" : ""}`}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        {...props}
      />
      {hint && !error ? (
        <span className="form-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="form-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
