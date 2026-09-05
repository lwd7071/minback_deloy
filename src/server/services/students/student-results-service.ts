import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { listStudentResults } from "@/server/repositories/student-results-repository";
import type { VerifiedStudentSession } from "@/types/student";
import type { StudentResultsResponseDto } from "@/types/student-results";

export async function getStudentResults(
  session: VerifiedStudentSession,
  assignmentId?: string,
): Promise<StudentResultsResponseDto> {
  try {
    return {
      results: await listStudentResults(
        session.studentId,
        session.classSectionId,
        assignmentId,
      ),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
}
