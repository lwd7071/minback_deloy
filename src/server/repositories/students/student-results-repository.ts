import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentResultDto } from "@/types/student-results";

export async function listStudentResults(
  studentId: string,
  classSectionId: string,
): Promise<{
  results: StudentResultDto[];
  assignments: Array<{
    id: string;
    maxScore: number;
    included: boolean;
    weight: number | null;
  }>;
}> {
  const supabase = createAdminClient();
  const [assignmentResult, evaluationResult] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, max_score, gradebook_included, gradebook_weight")
      .eq("class_section_id", classSectionId),
    supabase
      .from("evaluations")
      .select(
        "assignment_id, score, feedback, status, criteria_scores, updated_at, assignments!inner(id, title, max_score, class_section_id, status, gradebook_included, gradebook_weight)",
      )
      .eq("student_id", studentId)
      .eq("status", "returned")
      .eq("assignments.class_section_id", classSectionId)
      .in("assignments.status", ["published", "closed"]),
  ]);
  const evaluations = evaluationResult.data;
  const evaluationError = evaluationResult.error;
  if (assignmentResult.error)
    throw new Error("STUDENT_RESULTS_ASSIGNMENTS_FAILED");
  if (evaluationError) throw new Error("STUDENT_RESULTS_EVALUATIONS_FAILED");

  return {
    assignments: (assignmentResult.data ?? []).map((assignment) => ({
      id: assignment.id,
      maxScore: Number(assignment.max_score),
      included: Boolean(assignment.gradebook_included),
      weight:
        assignment.gradebook_weight === null
          ? null
          : Number(assignment.gradebook_weight),
    })),
    results: (evaluations ?? [])
      .map((row) => {
        const assignment = row.assignments as unknown as {
          id: string;
          title: string;
          max_score: number;
          gradebook_included: boolean;
          gradebook_weight: number | string | null;
        };
        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          maxScore: Number(assignment.max_score),
          score: row.score === null ? null : Number(row.score),
          feedback: row.feedback || null,
          status: "returned" as const,
          includedInFinal: Boolean(assignment.gradebook_included),
          weight:
            assignment.gradebook_weight === null
              ? null
              : Number(assignment.gradebook_weight),
          criteriaScores: Array.isArray(row.criteria_scores)
            ? (row.criteria_scores as import("@/lib/evaluation-criteria").CriterionScore[])
            : undefined,
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
      }),
  };
}
