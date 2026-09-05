/**
 * POST /api/v1/teacher/class-sections/[classSectionId]/students/[studentId]/reset-pin
 *
 * Teacher reset PIN của Student về mã mặc định, revoke toàn bộ session cũ.
 *
 * Response:
 * - 200: { data: { studentId: string, mustChangePin: true } }
 * - 401: UNAUTHENTICATED
 * - 403: FORBIDDEN
 * - 404: NOT_FOUND
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { resetStudentPinByTeacher } from "@/server/services/students/student-management-service";
import { assertSameOrigin } from "@/lib/api/origin";

type RouteParams = {
  params: Promise<{ classSectionId: string; studentId: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);

    const { classSectionId, studentId } = await params;
    const result = await resetStudentPinByTeacher(classSectionId, studentId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
