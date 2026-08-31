import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findClassSectionById } from "@/server/repositories/class-section-repository";
import {
  previewStudentCsv,
  previewStudentXlsx,
  validateImportFile,
} from "@/server/services/class-sections/import-service";

type Context = { params: Promise<{ classSectionId: string }> };

export async function POST(
  request: NextRequest,
  { params }: Context,
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { classSectionId } = await params;
    const { teacher } = await requireTeacher();
    if (!(await findClassSectionById(classSectionId, teacher.id))) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy lớp học phần",
      );
    }
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
