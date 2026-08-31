import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-content">{children}</main>
    </div>
  );
}
