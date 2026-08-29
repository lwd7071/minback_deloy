/**
 * GET /api/v1/student/auth/session
 *
 * Lấy thông tin session hiện tại của Student.
 * Cho phép cả access_level='credential_change' và 'full'.
 *
 * Response:
 * - 200: { data: StudentSessionDto }
 * - 401: UNAUTHENTICATED | SESSION_EXPIRED
 */

import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { requireAnyStudentSession, buildStudentSessionDto } from "@/server/auth/student-session";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireAnyStudentSession();
    const dto = await buildStudentSessionDto(
      session.sessionId,
      session.studentId,
      session.accessLevel,
      session.expiresAt,
    );
    return successResponse(dto);
  } catch (error) {
    return errorResponse(error);
  }
}
