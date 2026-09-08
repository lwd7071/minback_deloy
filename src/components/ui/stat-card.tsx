import type { ReactNode } from "react";

export function StatCard({
  value,
  label,
  tone = "accent",
  detail,
  children,
}: {
  value: ReactNode;
  label: string;
  tone?: "accent" | "info" | "warning" | "success";
  detail?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className={`stat-card stat-card-${tone}`}>
      <strong>{value}</strong>
      <span className="muted">{label}</span>
      {detail ? <small className="stat-card-detail">{detail}</small> : null}
      {children}
    </Card>
  );
}

import { Card } from "./card";
