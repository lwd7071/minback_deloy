import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentResultDto } from "@/types/student-results";

export async function listStudentResults(
  studentId: string,
  classSectionId: string,
  assignmentId?: string,
): Promise<StudentResultDto[]> {
  const supabase = createAdminClient();
  let assignmentsQuery = supabase
    .from("assignments")
    .select("id, title, max_score")
    .eq("class_section_id", classSectionId)
    .in("status", ["published", "closed"]);
  if (assignmentId) assignmentsQuery = assignmentsQuery.eq("id", assignmentId);
  const { data: assignments, error: assignmentError } = await assignmentsQuery;
  if (assignmentError) throw new Error("STUDENT_RESULTS_ASSIGNMENTS_FAILED");
  if (!assignments?.length) return [];

  const ids = assignments.map((row) => row.id);
  const { data: evaluations, error: evaluationError } = await supabase
    .from("evaluations")
    .select("assignment_id, score, feedback, status, updated_at")
    .eq("student_id", studentId)
    .in("assignment_id", ids)
    .eq("status", "returned");
  if (evaluationError) throw new Error("STUDENT_RESULTS_EVALUATIONS_FAILED");

  const byAssignment = new Map((evaluations ?? []).map((row) => [row.assignment_id, row]));
  return assignments.flatMap((assignment) => {
    const evaluation = byAssignment.get(assignment.id);
    if (!evaluation) return [];
    return [{
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      maxScore: Number(assignment.max_score),
      score: evaluation.score === null ? null : Number(evaluation.score),
      feedback: evaluation.feedback || null,
      status: "returned" as const,
      returnedAt: evaluation.updated_at,
      updatedAt: evaluation.updated_at,
    }];
  });
}
