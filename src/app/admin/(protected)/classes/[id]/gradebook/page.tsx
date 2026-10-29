import { GradebookView } from "@/components/evaluations/teacher/gradebook-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { getTeacherGradebook } from "@/server/services/frontend-rebuild/frontend-api-service";

export default async function ClassGradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    studentPage?: string;
    assignmentPage?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  let data: Awaited<ReturnType<typeof getTeacherGradebook>>;
  try {
    data = await getTeacherGradebook(id, query);
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return <GradebookView classSectionId={id} data={data} />;
}
