
/**
 * POST /api/v1/teacher/class-sections/[classSectionId]/students/[studentId]/reset-pin
 *
 * Teacher reset PIN của Student: sinh PIN mới CSPRNG, revoke toàn bộ session cũ.
 * Trả initialPin một lần duy nhất — Teacher phân phối riêng cho Student.
 *
 * Response:
 * - 200: { data: { initialPin: string } }
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
    // initialPin được trả về một lần duy nhất — không log, không lưu thêm
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
