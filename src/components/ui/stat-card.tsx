import type { ReactNode } from "react";

export function StatCard({
  value,
  label,
  children,
}: {
  value: ReactNode;
  label: string;
  children?: ReactNode;
}) {
  return (
    <Card className="stat-card">
      <strong>{value}</strong>
      <span className="muted">{label}</span>
      {children}
    </Card>
  );
}

import { Card } from "./card";
