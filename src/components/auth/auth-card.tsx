import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";

export function AuthCard({
  back,
  title,
  context,
  children,
  footer,
}: {
  back?: { fallbackHref: string; ariaLabel?: string; forceFallback?: boolean };
  title?: string;
  context?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="auth-card">
      {back ? (
        <div className="page-back-slot">
          <BackLink {...back} />
        </div>
      ) : null}
      <header className={`auth-card-header${context ? " has-context" : ""}`}>
        {title ? <h1>{title}</h1> : null}
        {context ? <div className="auth-card-context">{context}</div> : null}
      </header>
      <div className="auth-form">{children}</div>
      {footer ? <footer className="auth-card-footer">{footer}</footer> : null}
    </section>
  );
}
