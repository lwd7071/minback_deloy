import type { ReactNode } from "react";

export default function TeacherAuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <main className="shell">{children}</main>;
}
