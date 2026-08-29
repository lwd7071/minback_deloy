/**
 * src/server/services/evaluation-history-service.ts
 *
 * Business logic cho Teacher xem lịch sử thay đổi điểm/feedback của Evaluation.
 */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { listEvaluationHistory } from "@/server/repositories/evaluation-history-repository";
import type { EvaluationHistoryDto } from "@/types/student";

/**
 * GET /api/v1/teacher/evaluations/:evaluationId/history
 *
 * Lấy lịch sử thay đổi của một Evaluation.
 * Authorization: Teacher phải sở hữu lớp chứa Evaluation này
 * (chain: evaluation → assignment → class_section → teacher_id).
 *
 * Lưu ý: Việc GHI lịch sử do PostgreSQL trigger xử lý tự động
 * khi Evaluation được UPDATE. Service này chỉ READ.
 */
export async function getEvaluationHistory(
  evaluationId: string,
): Promise<EvaluationHistoryDto[]> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new ApiError(
      401,
      API_ERROR_CODES.unauthenticated,
      "Vui lòng đăng nhập Teacher/Admin",
    );
  }

  // listEvaluationHistory sẽ tự kiểm tra authorization chain bên trong
  try {
    return await listEvaluationHistory(evaluationId, authData.user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";

    if (message.includes("quyền")) {
      throw new ApiError(
        403,
        API_ERROR_CODES.forbidden,
        "Không có quyền xem lịch sử Evaluation này",
      );
    }

    if (message.includes("Không tìm thấy")) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy Evaluation",
      );
    }

    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Đã xảy ra lỗi hệ thống",
    );
  }
}
