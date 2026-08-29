import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";

export default async function TeacherProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  try {
    await requireTeacher();
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
      redirect("/teacher/login");
    }
    // System errors (500) → rethrow to Next.js error boundary
    throw error;
  }

  return <main className="shell">{children}</main>;
}
