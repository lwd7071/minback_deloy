import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { requestStudentEmailChange } from "@/server/services/students/student-email-service";

const schema = z.object({ email: z.string().email().max(254) });
export async function POST(request: Request) {
  try { const session = await requireFullStudentSession(); const body = schema.parse(await request.json()); await requestStudentEmailChange(session.studentId, body.email); return successResponse({ message: "OTP đã được gửi đến email mới" }); }
  catch (error) { return errorResponse(error); }
}
