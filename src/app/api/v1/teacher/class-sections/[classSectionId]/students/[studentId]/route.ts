/**
 * GET /api/v1/teacher/class-sections/[classSectionId]/students/[studentId]
 * PATCH /api/v1/teacher/class-sections/[classSectionId]/students/[studentId]
 *
 * GET: Xem chi tiết một Student trong lớp.
 * PATCH: Cập nhật fullName, email, nickname của Student.
 *
 * Response:
 * - 200: { data: StudentAdminDto }
 * - 400: VALIDATION_ERROR
 * - 401: UNAUTHENTICATED
 * - 403: FORBIDDEN
 * - 404: NOT_FOUND
 * - 409: CONFLICT (nickname duplicate)
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { studentAdminUpdateSchema } from "@/schemas/student-auth";
import {
  getStudentInClass,
  updateStudentInClass,
} from "@/server/services/student-management-service";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";

type RouteParams = {
  params: Promise<{ classSectionId: string; studentId: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { classSectionId, studentId } = await params;
    const student = await getStudentInClass(classSectionId, studentId);
    return successResponse(student);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);

    const { classSectionId, studentId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Request body không hợp lệ"),
      );
    }

    const parsed = studentAdminUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", details),
      );
    }

    const updated = await updateStudentInClass(
      classSectionId,
      studentId,
      parsed.data,
    );
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
