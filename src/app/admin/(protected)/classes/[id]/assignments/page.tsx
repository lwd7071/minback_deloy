import { ClassAssignmentsView } from "@/components/assignments/teacher/class-assignments-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { listTeacherAssignments } from "@/server/services/assignments/assignment-service";

export default async function ClassAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let assignments: Awaited<ReturnType<typeof listTeacherAssignments>>;
  try {
    assignments = await listTeacherAssignments(id);
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return (
    <ClassAssignmentsView
      classSectionId={id}
      initialAssignments={assignments}
    />
  );
}
