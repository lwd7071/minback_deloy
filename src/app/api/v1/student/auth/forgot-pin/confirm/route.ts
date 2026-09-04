import { NextResponse } from "next/server";
import { forgotPinConfirmSchema } from "@/schemas/student-auth";
import { confirmForgotPinOtp } from "@/server/services/students/student-auth-service";
import { ApiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = forgotPinConfirmSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Dữ liệu không hợp lệ",
            details: parsed.error.issues,
          },
        },
        { status: 400 },
      );
    }

    const rawIp = request.headers.get("x-forwarded-for");
    const result = await confirmForgotPinOtp(parsed.data, rawIp);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi hệ thống" } },
      { status: 500 },
    );
  }
}
