import { TeacherLoginForm } from "@/components/teacher/teacher-login-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";
export default function AdminLoginPage() {
  return (
    <main className="public-shell">
      <Card className="auth-wrap stack">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">M</span>MinBack
        </Link>
        <div>
          <p className="eyebrow">Khu vực giảng viên</p>
          <h1>Quản lý lớp học</h1>
          <p className="muted">Đăng nhập bằng tài khoản Teacher được cấp.</p>
        </div>
        <TeacherLoginForm />
      </Card>
    </main>
  );
}
