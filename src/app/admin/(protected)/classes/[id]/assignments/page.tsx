import { ClassAssignmentsView } from "@/components/assignments/teacher/class-assignments-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { listTeacherAssignments } from "@/server/services/assignments/assignment-service";

export default async function ClassAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let assignments: Awaited<ReturnType<typeof listTeacherAssignments>>;
  try {
    const { teacher } = await requireTeacher();
    assignments = await listTeacherAssignments(id, teacher.id);
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
