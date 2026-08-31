import { NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { listTeacherSubmissions } from "@/server/services/teacher-submission-service";

type Params = { params: Promise<{ assignmentId: string }> };

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { assignmentId } = await params;
    return successResponse(await listTeacherSubmissions(assignmentId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
