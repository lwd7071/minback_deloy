import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  finalizeStudentSubmission,
  getStudentSubmissionHistory,
} from "@/server/services/submission-service";

type Params = { params: Promise<{ assignmentId: string }> };

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { assignmentId } = await params;
    return successResponse(await getStudentSubmissionHistory(assignmentId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId } = await params;
    return successResponse(
      await finalizeStudentSubmission(assignmentId, await request.json()),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
