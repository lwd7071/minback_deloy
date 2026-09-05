import type { ReactNode } from "react";
import { AppIcon } from "./app-icon";

export function Alert({
  variant = "info",
  children,
  title,
}: {
  variant?: "success" | "info" | "warning" | "error";
  children: ReactNode;
  title?: string;
}) {
  return (
    <div
      className={`alert alert-${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <AppIcon
        name={
          variant === "success"
            ? "check"
            : variant === "error"
              ? "close"
              : "info"
        }
        size={18}
      />
      <div>
        {title ? <strong>{title}</strong> : null}
        <span>{children}</span>
      </div>
    </div>
  );
}
