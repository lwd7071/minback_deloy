import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { cacheTags, invalidateTags } from "@/server/cache/resource-tags";
import { updateTeacherGradebookConfig } from "@/server/services/frontend-rebuild/frontend-api-service";

type Context = { params: Promise<{ classSectionId: string }> };

export async function PUT(
  request: NextRequest,
  { params }: Context,
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
    const result = await updateTeacherGradebookConfig(classSectionId, body);
    invalidateTags([cacheTags.classGradebook(classSectionId)]);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
