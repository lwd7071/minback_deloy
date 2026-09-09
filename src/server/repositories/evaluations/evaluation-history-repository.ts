/**
 * src/server/repositories/evaluation-history-repository.ts
 *
 * Repository quản lý bảng `evaluation_history`.
 * Chỉ có READ — việc ghi do PostgreSQL trigger tự động xử lý
 * khi Evaluation được UPDATE (logic trong migration của Dev A).
 *
 * Authorization: phải đi qua chuỗi evaluation → assignment → class_section → teacher_id
 * để đảm bảo Teacher chỉ xem được history của Evaluation trong lớp mình quản lý.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EvaluationHistoryDto } from "@/types/evaluation";

/**
 * Tìm teacher_id sở hữu lớp chứa Evaluation này.
 * Trả về:
 * - undefined nếu Evaluation không tồn tại
 * - string | null là teacher_id nếu tìm thấy
 */
export async function findEvaluationOwnerTeacherId(
  evaluationId: string,
): Promise<string | null | undefined> {
  const supabase = createAdminClient();

  const { data: evalData, error: evalError } = await supabase
    .from("evaluations")
    .select("id, assignments(class_sections(teacher_id))")
    .eq("id", evaluationId)
    .maybeSingle();

  if (evalError || !evalData) {
    return undefined;
  }

  const classSection = (
    evalData as unknown as {
      assignments: { class_sections: { teacher_id: string } | null } | null;
    }
  ).assignments?.class_sections;

  return classSection?.teacher_id ?? null;
}

/**
 * Lấy danh sách lịch sử thay đổi của Evaluation theo evaluationId.
 * Sắp xếp: changed_at desc (mới nhất trước).
 */
export async function listEvaluationHistoryRows(
  evaluationId: string,
): Promise<EvaluationHistoryDto[]> {
  const supabase = createAdminClient();

  const { data: historyData, error: historyError } = await supabase
    .from("evaluation_history")
    .select(
      "id, evaluation_id, old_score, old_feedback, old_status, changed_at, changed_by, teachers(display_name)",
    )
    .eq("evaluation_id", evaluationId)
    .order("changed_at", { ascending: false });

  if (historyError) {
    throw new Error(
      `Không thể lấy lịch sử Evaluation: ${historyError.message}`,
    );
  }

  type HistoryRawRow = {
    id: string;
    evaluation_id: string;
    old_score: number | null;
    old_feedback: string;
    old_status: "pending" | "graded" | "returned";
    changed_at: string;
    changed_by: string;
    teachers: { display_name: string } | null;
  };

  return (historyData as unknown as HistoryRawRow[]).map((row) => ({
    id: row.id,
    evaluationId: row.evaluation_id,
    oldScore: row.old_score,
    oldFeedback: row.old_feedback,
    oldStatus: row.old_status,
    changedAt: row.changed_at,
    changedBy: {
      id: row.changed_by,
      displayName: row.teachers?.display_name ?? "Không rõ",
    },
  }));
}
