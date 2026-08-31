import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { getStudentProfile } from "@/server/services/student-profile-service";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireFullStudentSession();
    return successResponse(await getStudentProfile(session), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
