import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { errorResponse, successResponse } from "@/lib/api/response";
import { evaluationImportInputSchema } from "@/schemas/evaluation-import";
import { executeEvaluationImport } from "@/server/services/evaluations/evaluation-import-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { assignmentId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu JSON không hợp lệ");
    }

    const parsed = evaluationImportInputSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Dữ liệu đánh giá không hợp lệ",
        details,
      );
    }

    const result = await executeEvaluationImport(assignmentId, parsed.data);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
