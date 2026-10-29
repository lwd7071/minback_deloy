import { StudentWorkspaceView } from "@/components/students/student/student-workspace-view";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { getStudentResults } from "@/server/services/students/student-results-service";

export default async function StudentGradesPage({
  searchParams,
}: {
  searchParams?: Promise<{ assignment?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const session = await requireFullStudentSession();
  const { results, total } = await getStudentResults(session);
  return (
    <StudentWorkspaceView
      section="grades"
      initialAssignmentId={query.assignment}
      initialResults={results}
      initialTotal={total}
    />
  );
}
