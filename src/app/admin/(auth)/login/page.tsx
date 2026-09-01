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
          <Link
            className="btn btn-ghost btn-sm"
            href="/"
            style={{ fontSize: "0.84rem", color: "var(--muted)" }}
          >
            ← Trang chủ
          </Link>
        </div>
        <div>
          <h1>Đăng nhập giảng viên</h1>
          <p className="muted">Mở không gian quản lý lớp học của bạn.</p>
        </div>
        <TeacherLoginForm />
        <div style={{ textAlign: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--rule)" }}>
          <Link
            href="/"
            style={{ fontSize: "0.86rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            ← Về trang chủ MinBack
          </Link>
        </div>
      </Card>
    </main>
  );
}
