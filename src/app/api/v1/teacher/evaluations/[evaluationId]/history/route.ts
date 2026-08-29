/**
 * GET /api/v1/teacher/evaluations/[evaluationId]/history
 *
 * Lấy lịch sử thay đổi của một Evaluation.
 * Teacher phải sở hữu lớp chứa Evaluation này.
 *
 * Response:
 * - 200: { data: EvaluationHistoryDto[] }
 * - 401: UNAUTHENTICATED
 * - 403: FORBIDDEN
 * - 404: NOT_FOUND
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { getEvaluationHistory } from "@/server/services/evaluation-history-service";

type RouteParams = { params: Promise<{ evaluationId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { evaluationId } = await params;
    const history = await getEvaluationHistory(evaluationId);
    return successResponse(history);
  } catch (error) {
    return errorResponse(error);
  }
}
