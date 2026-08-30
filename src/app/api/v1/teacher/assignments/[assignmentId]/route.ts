import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  deleteTeacherAssignment,
  getTeacherAssignment,
  updateTeacherAssignment,
} from "@/server/services/assignment-service";

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
    return successResponse(await getTeacherAssignment(parseId(assignmentId)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    await requireTeacher();
    assertSameOrigin(request);
    const { assignmentId } = await params;
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
      await updateTeacherAssignment(parseId(assignmentId), body),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    await requireTeacher();
    assertSameOrigin(request);
    const { assignmentId } = await params;
    await deleteTeacherAssignment(parseId(assignmentId));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
