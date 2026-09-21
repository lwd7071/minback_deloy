import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { listStudentResults } from "@/server/repositories/students/student-results-repository";
import { withServerTiming } from "@/server/lib/server-timing";
import type { VerifiedStudentSession } from "@/types/student";
import type { StudentResultsResponseDto } from "@/types/student-results";

export async function getStudentResults(
  session: VerifiedStudentSession,
  assignmentId?: string,
): Promise<StudentResultsResponseDto> {
  try {
    return {
      results: await withServerTiming(
        "/class/[code]/results",
        () =>
          listStudentResults(
            session.studentId,
            session.classSectionId,
            assignmentId,
          ),
        (results) => results.length,
      ),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
}
