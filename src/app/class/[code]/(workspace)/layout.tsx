import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { StudentWorkspaceLayout } from "@/components/layout/student/student-workspace";
import { ApiError } from "@/lib/api/errors";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { findClassSectionCodeById } from "@/server/repositories/student-repository";

export default async function StudentWorkspaceRouteLayout({ children, params }: { children: ReactNode; params: Promise<{ code: string }> }) {
  const { code } = await params;
  let classSectionId: string;
  try {
    classSectionId = (await requireFullStudentSession()).classSectionId;
  } catch (error) {
    if (error instanceof ApiError && error.code === "CREDENTIAL_CHANGE_REQUIRED") redirect(`/class/${encodeURIComponent(code.toUpperCase())}/onboarding`);
    redirect(`/class/${encodeURIComponent(code.toUpperCase())}/login`);
  }
  const canonicalCode = await findClassSectionCodeById(classSectionId);
  if (canonicalCode && canonicalCode !== code.toUpperCase()) redirect(`/class/${encodeURIComponent(canonicalCode)}/profile`);
  return <StudentWorkspaceLayout classCode={code.toUpperCase()}>{children}</StudentWorkspaceLayout>;
}
