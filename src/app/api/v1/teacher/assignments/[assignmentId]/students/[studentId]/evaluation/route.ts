import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { upsertTeacherEvaluation } from "@/server/services/evaluation-service";

type RouteContext = {
  params: Promise<{ assignmentId: string; studentId: string }>;
};

function parseId(value: string, label: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      `${label} ID không hợp lệ`,
    );
  }
  return value;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    await requireTeacher();
    assertSameOrigin(request);
    const { assignmentId, studentId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }
    return successResponse(
      await upsertTeacherEvaluation(
        parseId(assignmentId, "Assignment"),
        parseId(studentId, "Student"),
        body,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
