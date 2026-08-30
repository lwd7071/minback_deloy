import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  classSectionCreateSchema,
  classSectionListQuerySchema,
} from "@/schemas/class-section";
import {
  createTeacherClassSection,
  listTeacherClassSections,
} from "@/server/services/class-section-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = classSectionListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Tham số phân trang không hợp lệ",
      );
    }

    const result = await listTeacherClassSections(parsed.data);
    return successResponse(result.data, undefined, result.meta);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
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
    const parsed = classSectionCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }
    const created = await createTeacherClassSection(parsed.data);
    return successResponse(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
