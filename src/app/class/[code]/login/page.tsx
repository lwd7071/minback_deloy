import { Card } from "@/components/ui/card";
import { PinLoginForm } from "@/components/student/pin-login-form";
import Link from "next/link";
import { findPublicClassSectionByCode } from "@/server/repositories/frontend-rebuild-repository";

export default async function ClassLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nickname?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const normalizedCode = code.toUpperCase();
  const classSection = await findPublicClassSectionByCode(normalizedCode);
  const className = classSection?.name ?? "Lớp học phần";

  return (
    <main className="public-shell">
      <Card className="auth-card stack" style={{ borderTop: "4px solid var(--primary)" }}>
        <Link className="brand-lockup" href="/">
          MinBack
        </Link>
        <div className="auth-heading">
          <p className="auth-eyebrow">Đăng nhập lớp học phần</p>
          <h2 className="auth-title">{normalizedCode}</h2>
          <p className="auth-class">{className}</p>
        </div>
        <PinLoginForm
          classCode={normalizedCode}
          initialNickname={query.nickname ?? ""}
        />
      </Card>
    </main>
  );
}
