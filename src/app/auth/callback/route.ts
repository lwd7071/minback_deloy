import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { loginStudentViaGoogle } from "@/server/services/students/student-auth-service";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const classCode = requestUrl.searchParams.get("classCode");
  const origin = requestUrl.origin;

  if (!classCode) {
    return NextResponse.redirect(`${origin}/`);
  }

  const encodedClassCode = encodeURIComponent(classCode);

  if (!code) {
    const errorUrl = new URL(`/class/${encodedClassCode}`, origin);
    errorUrl.searchParams.set("error", "Đăng nhập Google thất bại hoặc bị hủy");
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user || !data.user.email) {
      throw new Error(error?.message ?? "Không lấy được thông tin email Google");
    }

    const email = data.user.email;

    // Xác thực sinh viên trong lớp học phần
    const result = await loginStudentViaGoogle({
      email,
      classCode,
    });

    // Set cookie phiên sinh viên của MinBack
    const cookieStore = await cookies();
    cookieStore.set(
      result.cookieName,
      result.rawToken,
      result.cookieOptions,
    );

    // Chuyển hướng tới onboarding nếu cần đặt PIN, hoặc tới profile nếu đã hoàn tất
    const targetPath =
      result.dto.accessLevel === "credential_change" ||
      result.dto.mustChangeNickname ||
      result.dto.mustChangePin
        ? `/class/${encodedClassCode}/onboarding`
        : `/class/${encodedClassCode}/profile`;

    return NextResponse.redirect(new URL(targetPath, origin));
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Đăng nhập thất bại";

    // Đăng xuất Supabase session để không giữ session nếu không thuộc lớp
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }

    const errorUrl = new URL(`/class/${encodedClassCode}`, origin);
    errorUrl.searchParams.set("error", errorMessage);
    return NextResponse.redirect(errorUrl.toString());
  }
}
