/**
 * POST /api/v1/student/auth/logout
 *
 * Logout: revoke session trong DB và xóa cookie.
 * Cho phép cả access_level='credential_change' và 'full'.
 *
 * Response:
 * - 200: { data: { success: true } }
 * - 401: UNAUTHENTICATED | SESSION_EXPIRED
 */

import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import {
  STUDENT_SESSION_COOKIE,
  requireAnyStudentSession,
} from "@/server/auth/student-session";
import { logoutStudent } from "@/server/services/student-auth-service";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await requireAnyStudentSession();
    await logoutStudent(session.sessionId);

    // Xóa cookie bằng cách set maxAge=0
    const response = successResponse({ success: true });
    response.cookies.set(STUDENT_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
