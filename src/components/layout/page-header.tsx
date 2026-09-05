import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { fallbackHref: string; ariaLabel?: string };
}) {
  return (
    <header className="page-header">
      {back ? (
        <div className="page-back-slot">
          <BackLink {...back} />
        </div>
      ) : null}
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
