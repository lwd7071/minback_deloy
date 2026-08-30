import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { classSectionUpdateSchema } from "@/schemas/class-section";
import {
  deleteTeacherClassSection,
  getTeacherClassSection,
  updateTeacherClassSection,
} from "@/server/services/class-section-service";

type RouteContext = { params: Promise<{ classSectionId: string }> };

function parseId(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "ClassSection ID không hợp lệ",
    );
  }
  return value;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { classSectionId } = await params;
    return successResponse(
      await getTeacherClassSection(parseId(classSectionId)),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { classSectionId } = await params;
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
    const parsed = classSectionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }
    return successResponse(
      await updateTeacherClassSection(parseId(classSectionId), parsed.data),
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
    assertSameOrigin(request);
    const { classSectionId } = await params;
    await deleteTeacherClassSection(parseId(classSectionId));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
