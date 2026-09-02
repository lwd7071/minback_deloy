import { TeacherLoginForm } from "@/components/auth/teacher/teacher-login-form";
import { Card } from "@/components/ui/card";
import Link from "next/link";
export default function AdminLoginPage() {
  return (
    <main className="public-shell">
      <Card className="auth-wrap stack">
        <div className="split" style={{ marginBottom: "4px" }}>
          <Link className="brand-lockup" href="/">
            MinBack
          </Link>
          <Link className="btn btn-ghost btn-sm auth-back-link" href="/">
            ← Trang chủ
          </Link>
        </div>
        <div>
          <h1>Đăng nhập giảng viên</h1>
          <p className="muted">Mở không gian quản lý lớp học của bạn.</p>
        </div>
        <TeacherLoginForm />
        <div className="auth-home-link-wrap">
          <Link href="/" className="auth-home-link">
            ← Về trang chủ MinBack
          </Link>
        </div>
      </Card>
    </main>
  );
}
