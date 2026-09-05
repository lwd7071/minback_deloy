import type { SelectHTMLAttributes } from "react";

export function Dropdown({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select className={`input ${props.className ?? ""}`} {...props}>
        {children}
      </select>
    </label>
  );
}
