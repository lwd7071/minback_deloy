import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  label,
  hint,
  error,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-label">{label}</span>
      {hint ? <span className="form-label-hint">{hint}</span> : null}
      <textarea
        className={`input ${error ? "input-error" : ""}`}
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
