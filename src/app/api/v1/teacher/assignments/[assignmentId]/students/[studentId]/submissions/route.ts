import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getTeacherStudentSubmissions } from "@/server/services/teacher-submission-service";

type Params = { params: Promise<{ assignmentId: string; studentId: string }> };

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { assignmentId, studentId } = await params;
    return successResponse(
      await getTeacherStudentSubmissions(assignmentId, studentId),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
