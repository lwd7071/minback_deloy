import { ChangeCredentialsForm } from "@/components/auth/student/change-credentials-form";
import { AuthCard } from "@/components/auth/auth-card";
import { redirect } from "next/navigation";
import { requireAnyStudentSession } from "@/server/auth/student-session";
import { findClassSectionCodeById } from "@/server/repositories/students/student-repository";
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
      redirect(`/class/${encodeURIComponent(code.toUpperCase())}`);
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
      <AuthCard
        title="Hoàn tất tài khoản"
        context={
          <span className="muted">
            Đổi nickname và PIN trước khi mở hồ sơ học tập.
          </span>
        }
      >
        <ChangeCredentialsForm classCode={code.toUpperCase()} />
      </AuthCard>
    </main>
  );
}
