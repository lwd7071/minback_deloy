import { redirect } from "next/navigation";

import { TeacherLoginForm } from "@/components/teacher/teacher-login-form";
import { ApiError } from "@/lib/api/errors";
import { getCurrentTeacher } from "@/server/auth/teacher-auth";

export default async function TeacherLoginPage() {
  try {
    await getCurrentTeacher();
    // Already logged in — redirect to dashboard
    redirect("/teacher/dashboard");
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
      // Not logged in — show the login form
    } else {
      // System error — rethrow to Next.js error boundary
      throw error;
    }
  }

  return (
    <section className="surface">
      <h1>Đăng nhập Teacher/Admin</h1>
      <p className="muted">
        Đăng nhập để quản lý lớp học phần, bài tập và đánh giá.
      </p>
      <TeacherLoginForm />
    </section>
  );
}
