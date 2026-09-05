import { z } from "zod";
import { ApiError, API_ERROR_CODES } from "@/lib/api/errors";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { confirmStudentEmailChange } from "@/server/services/students/student-email-service";

const schema = z.object({ otp: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
  try {
    const session = await requireFullStudentSession();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, API_ERROR_CODES.validation, "OTP không hợp lệ");
    await confirmStudentEmailChange(session.studentId, parsed.data.otp);
    return successResponse({ message: "Cập nhật email thành công" });
  }
  catch (error) { return errorResponse(error); }
}
