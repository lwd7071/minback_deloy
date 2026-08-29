import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { teacherLoginSchema } from "@/schemas/teacher-auth";
import { loginTeacher } from "@/server/auth/teacher-auth";

export async function POST(request: Request) {
  console.log("SERVER SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  try {
    assertSameOrigin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }

    const parsed = teacherLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
        parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    const teacher = await loginTeacher(parsed.data.email, parsed.data.password);

    return successResponse({ teacher });
  } catch (error) {
    console.error("[LOGIN ROUTE ERROR]", error);
    return errorResponse(error);
  }
}
