import { AuthCard } from "@/components/auth/auth-card";
import { SetPasswordForm } from "@/components/auth/teacher/set-password-form";

type SearchParams = Promise<{
  token_hash?: string;
  type?: string;
}>;

export default async function AdminSetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tokenHash = params.token_hash ?? "";
  const isInvite = params.type === "invite";

  return (
    <main className="public-shell">
      <AuthCard
        back={{
          fallbackHref: "/admin/login",
          ariaLabel: "Quay lại đăng nhập",
          forceFallback: true,
        }}
        title="Thiết lập mật khẩu"
        context={
          isInvite
            ? "Tạo mật khẩu để hoàn tất tài khoản giảng viên."
            : "Liên kết mời không hợp lệ hoặc đã hết hạn."
        }
      >
        {isInvite && tokenHash ? (
          <SetPasswordForm tokenHash={tokenHash} />
        ) : (
          <p className="muted">
            Vui lòng liên hệ quản trị viên để nhận một lời mời mới.
          </p>
        )}
      </AuthCard>
    </main>
  );
}
