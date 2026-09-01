import { redirect } from "next/navigation";
import { ClassOverviewView } from "@/components/class-sections/teacher/class-overview-view";
import { getTeacherClassSection } from "@/server/services/class-sections/class-section-service";
export default async function AdminClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  if (tab === "students" || tab === "assignments" || tab === "gradebook") {
    redirect(`/admin/classes/${encodeURIComponent(id)}/${tab}`);
  }
  const section = await getTeacherClassSection(id);
  return <ClassOverviewView classSectionId={id} code={section.code} name={section.name} />;
}
