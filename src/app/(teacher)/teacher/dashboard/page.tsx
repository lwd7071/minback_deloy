import { LogoutButton } from "@/components/teacher/logout-button";
import { requireTeacher } from "@/server/auth/teacher-auth";

export default async function TeacherDashboardPage() {
  const { teacher } = await requireTeacher();

  return (
    <section className="surface">
      <p className="eyebrow">Teacher Dashboard</p>
      <h1>Xin chào, {teacher.displayName}</h1>
      <p className="muted">
        Quản lý lớp học phần, bài tập và đánh giá từ trang tổng quan này.
      </p>
      <LogoutButton />
    </section>
  );
}
