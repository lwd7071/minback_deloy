import { errorResponse, successResponse } from "@/lib/api/response";
import { getCurrentTeacher } from "@/server/auth/teacher-auth";

export async function GET() {
  try {
    const teacher = await getCurrentTeacher();

    return successResponse({ teacher });
  } catch (error) {
    return errorResponse(error);
  }
}
