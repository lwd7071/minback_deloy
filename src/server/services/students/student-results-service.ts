import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { listStudentResults } from "@/server/repositories/students/student-results-repository";
import { withServerTiming } from "@/server/lib/server-timing";
import type { VerifiedStudentSession } from "@/types/student";
import type { StudentResultsResponseDto } from "@/types/student-results";
import { calculateGradebookScore } from "@/lib/gradebook";

export async function getStudentResults(
  session: VerifiedStudentSession,
  assignmentId?: string,
): Promise<StudentResultsResponseDto> {
  try {
    const data = await withServerTiming(
      "/class/[code]/results",
      () => listStudentResults(session.studentId, session.classSectionId),
      (result) => result.results.length,
    );
    const evaluations = new Map(
      data.results.map((result) => [result.assignmentId, result]),
    );
    return {
      results: assignmentId
        ? data.results.filter((result) => result.assignmentId === assignmentId)
        : data.results,
      total: calculateGradebookScore(
        data.assignments.map((assignment) => {
          const evaluation = evaluations.get(assignment.id);
          return {
            assignmentId: assignment.id,
            maxScore: assignment.maxScore,
            included: assignment.included,
            weight: assignment.weight,
            score: evaluation?.score ?? null,
            status: evaluation?.status ?? "pending",
          };
        }),
      ),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
}
