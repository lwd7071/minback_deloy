import { ChangeCredentialsForm } from "@/components/auth/student/change-credentials-form";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { requireAnyStudentSession } from "@/server/auth/student-session";
import { findClassSectionCodeById } from "@/server/repositories/student-repository";
import { ApiError } from "@/lib/api/errors";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let session: Awaited<ReturnType<typeof requireAnyStudentSession>>;
  try {
    session = await requireAnyStudentSession();
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/class/${encodeURIComponent(code.toUpperCase())}/login`);
    }
    throw error;
  }
  const canonicalCode = await findClassSectionCodeById(session.classSectionId);
  if (canonicalCode && canonicalCode !== code.toUpperCase()) {
    redirect(`/class/${encodeURIComponent(canonicalCode)}/onboarding`);
  }
  if (session.accessLevel === "full") {
    redirect(
      `/class/${encodeURIComponent(canonicalCode ?? code.toUpperCase())}/profile`,
    );
  }
  return (
    <main className="public-shell">
      <Card className="auth-wrap stack">
        <h1>Hoàn tất tài khoản</h1>
        <p className="muted">Đổi nickname và PIN trước khi mở hồ sơ học tập.</p>
        <ChangeCredentialsForm classCode={code.toUpperCase()} />
      </Card>
    </main>
  );
}
