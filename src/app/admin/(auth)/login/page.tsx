import { TeacherLoginForm } from "@/components/auth/teacher/teacher-login-form";
import { AuthCard } from "@/components/auth/auth-card";
export default function AdminLoginPage() {
  return (
    <main className="public-shell">
      <AuthCard
        back={{
          fallbackHref: "/",
          ariaLabel: "Quay lại trang chủ",
          forceFallback: true,
        }}
        title="Đăng nhập"
      >
        <TeacherLoginForm />
      </AuthCard>
    </main>
  );
}
