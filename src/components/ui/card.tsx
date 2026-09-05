import type { HTMLAttributes } from "react";

export function Card({
  hover,
  glass,
  variant = "default",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  glass?: boolean;
  variant?: "default" | "interactive" | "highlighted" | "compact";
}) {
  return (
    <div
      className={`card card-${variant} ${hover ? "card-hover" : ""} ${glass ? "glass" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
