import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getTeacherClassSection } from "@/server/services/class-sections/class-section-service";
import { ClassContextNav } from "@/components/class-sections/teacher/class-context-nav";
import { ApiError, API_ERROR_CODES } from "@/lib/api/errors";

export default async function ClassSectionLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  try {
    await getTeacherClassSection(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === API_ERROR_CODES.notFound) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="class-section-layout">
      <ClassContextNav classSectionId={id} />
      <div className="class-section-content">{children}</div>
    </div>
  );
}
