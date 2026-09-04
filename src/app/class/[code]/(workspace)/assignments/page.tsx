import { StudentWorkspaceView } from "@/components/students/student/student-workspace-view";

export default async function StudentAssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ assignment?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  return (
    <StudentWorkspaceView
      section="assignments"
      initialAssignmentId={query.assignment}
    />
  );
}
