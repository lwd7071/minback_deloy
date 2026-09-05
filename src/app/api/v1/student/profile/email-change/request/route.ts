import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, API_ERROR_CODES } from "@/lib/api/errors";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { requestStudentEmailChange } from "@/server/services/students/student-email-service";

const schema = z.object({ email: z.string().email().max(254) });
export async function POST(request: Request) {
  try {
    const session = await requireFullStudentSession();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, API_ERROR_CODES.validation, "Email không hợp lệ");
    await requestStudentEmailChange(session.studentId, parsed.data.email);
    return successResponse({ message: "OTP đã được gửi đến email mới" });
  }
  catch (error) { return errorResponse(error); }
}
