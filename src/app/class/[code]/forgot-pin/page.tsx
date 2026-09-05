import { Card } from "@/components/ui/card";
import { ForgotPinForm } from "@/components/auth/student/forgot-pin-form";

export default async function ForgotPinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="public-shell">
      <Card className="auth-wrap stack">
        <div className="auth-heading">
          <p className="auth-eyebrow">Khôi phục quyền truy cập</p>
          <h1
            className="auth-title"
            style={{ marginTop: 0, marginBottom: "4px" }}
          >
            Quên mã PIN
          </h1>
          <p className="auth-class" style={{ marginTop: 0 }}>
            Mã lớp: {code.toUpperCase()}
          </p>
        </div>
        <ForgotPinForm classCode={code.toUpperCase()} />
      </Card>
    </main>
  );
}
