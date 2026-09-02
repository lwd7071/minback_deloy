import { type NextRequest, NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { cacheTags, invalidateTags } from "@/server/cache/resource-tags";
import { createTeacherClassSectionSetup } from "@/server/services/class-sections/class-section-setup-service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    const code = formData.get("code");
    const name = formData.get("name");
    const fileValue = formData.get("file");
    if (typeof code !== "string" || typeof name !== "string") {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Thông tin lớp không hợp lệ",
      );
    }
    if (fileValue !== null && !(fileValue instanceof File)) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Tệp import không hợp lệ",
      );
    }

    const result = await createTeacherClassSectionSetup(
      { code, name },
      fileValue,
    );
    const id = result.data.classSection.id;
    invalidateTags([
      cacheTags.teacher(result.teacherId),
      cacheTags.teacherClasses(result.teacherId),
      cacheTags.teacherDashboard(result.teacherId),
      cacheTags.publicClass(result.data.classSection.code),
      cacheTags.classSection(id),
      cacheTags.classStudents(id),
      cacheTags.classStudentProfiles(id),
      cacheTags.classGradebook(id),
    ]);
    return successResponse(result.data, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
