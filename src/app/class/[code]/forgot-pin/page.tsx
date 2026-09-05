import { ForgotPinForm } from "@/components/auth/student/forgot-pin-form";
import { AuthCard } from "@/components/auth/auth-card";

export default async function ForgotPinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="public-shell">
      <AuthCard
        back={{
          fallbackHref: `/class/${encodeURIComponent(code)}`,
          ariaLabel: "Quay lại",
        }}
        title="Quên mã PIN"
        context={<span className="auth-class-code">{code.toUpperCase()}</span>}
      >
        <ForgotPinForm classCode={code.toUpperCase()} />
      </AuthCard>
    </main>
  );
}
