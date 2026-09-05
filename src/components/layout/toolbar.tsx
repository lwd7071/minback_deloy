import type { ReactNode } from "react";

export function Toolbar({
  search,
  filters,
  actions,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-search">{search}</div>
      {filters ? <div className="toolbar-filters">{filters}</div> : null}
      {actions ? <div className="toolbar-actions">{actions}</div> : null}
    </div>
  );
}
