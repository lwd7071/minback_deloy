import { type NextRequest, NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { bulkUpsertTeacherEvaluations } from "@/server/services/bulk-evaluation-service";

type Context = { params: Promise<{ assignmentId: string }> };

export async function PUT(
  request: NextRequest,
  { params }: Context,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId } = await params;
    return successResponse(
      await bulkUpsertTeacherEvaluations(assignmentId, await request.json()),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
