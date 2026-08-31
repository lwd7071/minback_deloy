import { TeacherLoginForm } from "@/components/teacher/teacher-login-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";
export default function AdminLoginPage() {
  return (
    <main className="public-shell">
      <Card className="auth-wrap stack">
        <Link className="brand-lockup" href="/">
          MinBack
        </Link>
        <div>
          <h1>Đăng nhập giảng viên</h1>
          <p className="muted">Mở không gian quản lý lớp học của bạn.</p>
        </div>
        <TeacherLoginForm />
      </Card>
    </main>
  );
}
