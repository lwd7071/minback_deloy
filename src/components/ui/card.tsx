import type { HTMLAttributes } from "react";

export function Card({
  hover,
  glass,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean; glass?: boolean }) {
  return (
    <div
      className={`card ${hover ? "card-hover" : ""} ${glass ? "glass" : ""} ${className}`}
      {...props}
    />
  );
}
