import { ClassSectionDetailView } from "@/components/teacher/class-sections/class-section-detail-view";

export default async function ClassSectionDetailPage({
  params,
}: {
  params: Promise<{ classSectionId: string }>;
}) {
  const { classSectionId } = await params;
  return <ClassSectionDetailView classSectionId={classSectionId} />;
}
