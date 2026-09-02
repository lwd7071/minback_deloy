import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  previewStudentCsv,
  previewStudentXlsx,
  validateImportFile,
} from "@/server/services/class-sections/import-service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    await requireTeacher();
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Vui lòng chọn tệp CSV hoặc XLSX",
      );
    }
    const kind = validateImportFile(file);
    const data =
      kind === "csv"
        ? previewStudentCsv(await file.text())
        : await previewStudentXlsx(await file.arrayBuffer());
    return successResponse(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
