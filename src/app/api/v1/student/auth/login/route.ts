/**
 * POST /api/v1/student/auth/login
 *
 * Đăng nhập Student bằng classCode + nickname + PIN.
 * Set cookie HttpOnly + Secure sau khi xác thực thành công.
 *
 * Response:
 * - 200: { data: StudentSessionDto } + set cookie
 * - 400: VALIDATION_ERROR
 * - 401: INVALID_CREDENTIALS
 * - 429: LOGIN_RATE_LIMITED
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";  // trợ giúp chuẩn hóa cấu trúc json 
import { studentLoginSchema } from "@/schemas/student-auth"; // tính hợp lệ input 
import { loginStudent } from "@/server/services/students/student-auth-service"; // xử lý logic đăng nhập của sinh viên 
import { ApiError } from "@/lib/api/errors"; // xử lý lỗi 
import { assertSameOrigin } from "@/lib/api/origin"; //  kiểm tra tính hợp lệ của request  

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);

    // Parse và validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Request body không hợp lệ"),
      );
    }

    const parsed = studentLoginSchema.safeParse(body);
    if (!parsed.success) { // nếu lỗi trích ra filed va lý do qua message 
      const details = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", details),
      );
    }

    // Lấy IP từ header (Next.js / Vercel / nginx forward)
    const rawIp = // đếm số lần đăng nhập sai qua trích xuất ip client 
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip");

    // Gọi service
    const result = await loginStudent(parsed.data, rawIp);

    // Set cookie và trả response
    const response = successResponse(result.dto);
    response.cookies.set(
      result.cookieName,
      result.rawToken,
      result.cookieOptions,
    );

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
