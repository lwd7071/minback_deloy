import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="auth-card">
      {title ? <h1>{title}</h1> : null}
      {description ? (
        <p className="auth-card-description">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
