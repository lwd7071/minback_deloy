/**
 * GET /api/v1/teacher/class-sections/[classSectionId]/students
 * POST — không dùng (chỉ Teacher import từ /import, không thêm manual)
 *
 * GET: Lấy danh sách Student trong lớp có phân trang và tìm kiếm.
 *
 * Query params: page, pageSize, search
 *
 * Response:
 * - 200: { data: StudentAdminDto[], meta: { page, pageSize, total } }
 * - 400: VALIDATION_ERROR
 * - 401: UNAUTHENTICATED
 * - 403: FORBIDDEN
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { studentListQuerySchema } from "@/schemas/student-auth";
import { listStudentsInClass } from "@/server/services/student-management-service";
import { ApiError } from "@/lib/api/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classSectionId: string }> },
): Promise<NextResponse> {
  try {
    const { classSectionId } = await params;

    const { searchParams } = new URL(request.url);
    const queryRaw = {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const parsed = studentListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return errorResponse(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          "Query params không hợp lệ",
          details,
        ),
      );
    }

    const result = await listStudentsInClass(classSectionId, parsed.data);
    return successResponse(result.students, undefined, result.meta);
  } catch (error) {
    return errorResponse(error);
  }
}
