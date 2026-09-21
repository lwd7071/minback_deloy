import { StudentWorkspaceView } from "@/components/students/student/student-workspace-view";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { getStudentResults } from "@/server/services/students/student-results-service";

export default async function StudentProfilePage() {
  const session = await requireFullStudentSession();
  const { results } = await getStudentResults(session);
  return <StudentWorkspaceView section="overview" initialResults={results} />;
}
