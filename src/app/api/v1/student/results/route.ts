import { NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { getStudentResults } from "@/server/services/students/student-results-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireFullStudentSession();
    const assignmentId =
      request.nextUrl.searchParams.get("assignmentId") ?? undefined;
    return successResponse(await getStudentResults(session, assignmentId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
