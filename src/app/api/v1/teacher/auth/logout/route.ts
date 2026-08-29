import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { logoutTeacher } from "@/server/auth/teacher-auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    await logoutTeacher();

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
