import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getTeacherClassSection } from "@/server/services/class-sections/class-section-service";
import { ClassContextNav } from "@/components/class-sections/teacher/class-context-nav";

export default async function ClassSectionLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  let section;
  try {
    section = await getTeacherClassSection(id);
  } catch {
    notFound();
  }

  return (
    <div className="class-section-layout">
      <ClassContextNav
        classSectionId={id}
        code={section.code}
        name={section.name}
      />
      <div className="class-section-content">{children}</div>
    </div>
  );
}
