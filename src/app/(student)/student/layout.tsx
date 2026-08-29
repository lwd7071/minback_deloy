import type { ReactNode } from "react";

export default function StudentLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <main className="shell">{children}</main>;
}
