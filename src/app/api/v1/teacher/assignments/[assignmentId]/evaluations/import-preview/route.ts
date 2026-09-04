import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { previewEvaluationFile } from "@/server/services/evaluations/evaluation-import-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId } = await params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Vui lòng chọn tệp bảng điểm Excel hoặc CSV");
    }

    const buffer = await file.arrayBuffer();
    const preview = await previewEvaluationFile(assignmentId, buffer, file.name);

    return successResponse(preview);
  } catch (error) {
    return errorResponse(error);
  }
}
