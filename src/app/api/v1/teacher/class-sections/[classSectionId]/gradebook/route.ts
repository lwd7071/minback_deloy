import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getTeacherGradebook } from "@/server/services/frontend-api-service";

type Context = { params: Promise<{ classSectionId: string }> };

export async function GET(
  request: NextRequest,
  { params }: Context,
): Promise<NextResponse> {
  try {
    const { classSectionId } = await params;
    const query = new URL(request.url).searchParams;
    return successResponse(
      await getTeacherGradebook(classSectionId, {
        studentPage: query.get("studentPage") ?? undefined,
        studentPageSize: query.get("studentPageSize") ?? undefined,
        assignmentPage: query.get("assignmentPage") ?? undefined,
        assignmentPageSize: query.get("assignmentPageSize") ?? undefined,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
