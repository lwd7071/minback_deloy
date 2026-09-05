import type { ButtonHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "destructive-outline";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Đang xử lý…" : children}
    </button>
  );
}
