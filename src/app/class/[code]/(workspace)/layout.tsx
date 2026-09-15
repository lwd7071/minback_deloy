import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { StudentWorkspaceLayout } from "@/components/layout/student/student-workspace";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { findClassSectionCodeById } from "@/server/repositories/students/student-repository";
import { getStudentWorkspaceIdentity } from "@/server/services/students/student-profile-service";
import { handleStudentWorkspaceError } from "@/server/navigation/page-errors";
import { Skeleton } from "@/components/ui/skeleton";

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
        <div className="stack" aria-busy="true">
          <Skeleton width="220px" height="30px" />
          <Skeleton width="100%" height="110px" />
          <Skeleton width="100%" height="260px" />
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
  let identity: Awaited<ReturnType<typeof getStudentWorkspaceIdentity>>;
  try {
    const session = await requireFullStudentSession();
    const foundCode = await findClassSectionCodeById(session.classSectionId);
    if (!foundCode) redirect(`/class/${encodeURIComponent(classCode)}`);
    if (foundCode !== classCode)
      redirect(`/class/${encodeURIComponent(foundCode)}/profile`);
    canonicalCode = foundCode;
    identity = await getStudentWorkspaceIdentity(session);
  } catch (error) {
    return handleStudentWorkspaceError(error, classCode);
  }
  return (
    <StudentWorkspaceLayout classCode={canonicalCode} identity={identity}>
      {children}
    </StudentWorkspaceLayout>
  );
}
