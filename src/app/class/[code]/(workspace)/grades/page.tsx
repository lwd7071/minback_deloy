import { StudentWorkspaceView } from "@/components/students/student/student-workspace-view";

export default async function StudentGradesPage({
  searchParams,
}: {
  searchParams?: Promise<{ assignment?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  return (
    <StudentWorkspaceView
      section="grades"
      initialAssignmentId={query.assignment}
    />
  );
}
