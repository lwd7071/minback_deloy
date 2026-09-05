import type { ReactNode } from "react";

export function Badge({
  variant = "info",
  children,
}: {
  variant?:
    | "info"
    | "success"
    | "warning"
    | "error"
    | "neutral"
    | "draft"
    | "returned"
    | string;
  children: ReactNode;
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
