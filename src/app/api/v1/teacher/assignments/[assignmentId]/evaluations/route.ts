import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { listTeacherEvaluations } from "@/server/services/evaluations/evaluation-service";

type RouteContext = { params: Promise<{ assignmentId: string }> };

function parseId(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Assignment ID không hợp lệ",
    );
  }
  return value;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    await requireTeacher();
    const { assignmentId } = await params;
    return successResponse(
      await listTeacherEvaluations(parseId(assignmentId)),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
