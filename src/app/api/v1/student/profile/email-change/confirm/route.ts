import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { confirmStudentEmailChange } from "@/server/services/students/student-email-service";

const schema = z.object({ otp: z.string().regex(/^\d{6}$/) });
export async function POST(request: Request) {
  try { const session = await requireFullStudentSession(); const body = schema.parse(await request.json()); await confirmStudentEmailChange(session.studentId, body.otp); return successResponse({ message: "Cập nhật email thành công" }); }
  catch (error) { return errorResponse(error); }
}
