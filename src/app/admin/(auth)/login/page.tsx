import { TeacherLoginForm } from "@/components/auth/teacher/teacher-login-form";
import { AuthCard } from "@/components/auth/auth-card";
import { BackLink } from "@/components/ui/back-link";
export default function AdminLoginPage() {
  return (
    <main className="public-shell">
      <AuthCard
        title="Đăng nhập giảng viên"
        description="Mở không gian quản lý lớp học của bạn."
      >
        <TeacherLoginForm />
        <BackLink href="/">Trang chủ MinBack</BackLink>
      </AuthCard>
    </main>
  );
}
