/**
 * PATCH /api/v1/student/auth/credentials
 *
 * Student đổi nickname và/hoặc PIN.
 * Chỉ dùng được khi có session (cả credential_change và full).
 * Session rotate lên 'full' khi tất cả flag must_change_* được xóa.
 *
 * Response:
 * - 200: { data: StudentSessionDto } + set cookie mới nếu rotate
 * - 400: VALIDATION_ERROR
 * - 401: UNAUTHENTICATED | SESSION_EXPIRED
 * - 409: CONFLICT (nickname đã tồn tại)
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { credentialsUpdateSchema } from "@/schemas/student-auth";
import { requireAnyStudentSession } from "@/server/auth/student-session";
import { updateStudentCredentials } from "@/server/services/students/student-auth-service";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);

    // Xác thực session (bất kỳ access level)
    const session = await requireAnyStudentSession();

    // Parse và validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Request body không hợp lệ"),
      );
    }

    const parsed = credentialsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", details),
      );
    }

    const result = await updateStudentCredentials(
      session.sessionId,
      session.studentId,
      session.classSectionId,
      session.accessLevel,
      parsed.data,
    );

    const response = successResponse(result.dto);

    // Nếu session được rotate (có rawToken mới) → set cookie mới
    if (result.rawToken) {
      response.cookies.set(
        result.cookieName,
        result.rawToken,
        result.cookieOptions,
      );
    }

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
