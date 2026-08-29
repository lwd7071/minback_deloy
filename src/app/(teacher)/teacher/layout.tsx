import type { ReactNode } from "react";

export default function TeacherLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <main className="shell">{children}</main>;
}
