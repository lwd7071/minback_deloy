import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { signStudentSubmissionUpload } from "@/server/services/students/submission-service";

type Params = { params: Promise<{ assignmentId: string }> };

export async function POST(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId } = await params;
    return successResponse(
      await signStudentSubmissionUpload(assignmentId, await request.json()),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
