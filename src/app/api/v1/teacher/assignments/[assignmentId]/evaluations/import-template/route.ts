import { type NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/response";
import { generateEvaluationTemplate } from "@/server/services/evaluations/evaluation-import-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
): Promise<Response> {
  try {
    const { assignmentId } = await params;
    const { buffer, fileName } = await generateEvaluationTemplate(assignmentId);

    return new Response(buffer as never, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
