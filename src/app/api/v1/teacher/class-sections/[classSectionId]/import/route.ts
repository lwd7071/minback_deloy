import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  importTeacherClassSectionCsv,
  importTeacherClassSectionXlsx,
  validateImportFile,
} from "@/server/services/import-service";

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

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { classSectionId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Vui lòng tải lên tệp import hợp lệ",
      );
    }
    const type = validateImportFile(file);
    const result =
      type === "csv"
        ? await importTeacherClassSectionCsv(
            parseId(classSectionId),
            await file.text(),
          )
        : await importTeacherClassSectionXlsx(
            parseId(classSectionId),
            await file.arrayBuffer(),
          );
    return successResponse(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("[Import] Unexpected import failure", {
        code: error instanceof Error ? error.message : "UNKNOWN",
      });
    }
    return errorResponse(error);
  }
}
