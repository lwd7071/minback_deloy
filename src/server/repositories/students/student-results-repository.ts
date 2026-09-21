import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentResultDto } from "@/types/student-results";

export async function listStudentResults(
  studentId: string,
  classSectionId: string,
  assignmentId?: string,
): Promise<StudentResultDto[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("evaluations")
    .select(
      "assignment_id, score, feedback, status, updated_at, assignments!inner(id, title, max_score, class_section_id, status)",
    )
    .eq("student_id", studentId)
    .eq("status", "returned")
    .eq("assignments.class_section_id", classSectionId)
    .in("assignments.status", ["published", "closed"]);
  if (assignmentId) query = query.eq("assignment_id", assignmentId);

  const { data: evaluations, error: evaluationError } = await query;
  if (evaluationError) throw new Error("STUDENT_RESULTS_EVALUATIONS_FAILED");

  return (evaluations ?? [])
    .map((row) => {
      const assignment = row.assignments as unknown as {
        id: string;
        title: string;
        max_score: number;
      };
      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        maxScore: Number(assignment.max_score),
        score: row.score === null ? null : Number(row.score),
        feedback: row.feedback || null,
        status: "returned" as const,
        returnedAt: row.updated_at,
        updatedAt: row.updated_at,
      };
    })
    .sort((left, right) => {
      const timeDifference =
        new Date(right.returnedAt).getTime() -
        new Date(left.returnedAt).getTime();
      return (
        timeDifference || left.assignmentId.localeCompare(right.assignmentId)
      );
    });
}
