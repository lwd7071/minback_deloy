import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { StudentWorkspaceLayout } from "@/components/layout/student/student-workspace";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { findClassSectionCodeById } from "@/server/repositories/students/student-repository";
import { getStudentProfile } from "@/server/services/students/student-profile-service";
import { handleStudentWorkspaceError } from "@/server/navigation/page-errors";

export default async function StudentWorkspaceRouteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const classCode = code.toUpperCase();
  return (
    <Suspense
      fallback={
        <div className="workspace-state" aria-busy="true">
          Đang tải không gian học tập…
        </div>
      }
    >
      <StudentWorkspaceData classCode={classCode}>
        {children}
      </StudentWorkspaceData>
    </Suspense>
  );
}

async function StudentWorkspaceData({
  classCode,
  children,
}: {
  classCode: string;
  children: ReactNode;
}) {
  let canonicalCode: string;
  let profile: Awaited<ReturnType<typeof getStudentProfile>>;
  try {
    const session = await requireFullStudentSession();
    const foundCode = await findClassSectionCodeById(session.classSectionId);
    if (!foundCode) redirect(`/class/${encodeURIComponent(classCode)}`);
    if (foundCode !== classCode)
      redirect(`/class/${encodeURIComponent(foundCode)}/profile`);
    canonicalCode = foundCode;
    profile = await getStudentProfile(session);
  } catch (error) {
    return handleStudentWorkspaceError(error, classCode);
  }
  return (
    <StudentWorkspaceLayout classCode={canonicalCode} profile={profile}>
      {children}
    </StudentWorkspaceLayout>
  );
}
