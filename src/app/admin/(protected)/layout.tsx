import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireTeacher();
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNAUTHENTICATED")
      redirect("/admin/login");
    throw error;
  }
  return <div className="workspace-page teacher-workspace"><WorkspaceHeader role="teacher" /><main className="workspace-main">{children}</main></div>;
}
