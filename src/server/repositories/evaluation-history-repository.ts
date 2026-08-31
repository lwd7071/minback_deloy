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
import type { EvaluationHistoryDto } from "@/types/student";

/**
 * Lấy lịch sử thay đổi của một Evaluation theo evaluationId.
 * Kết hợp với thông tin Teacher (displayName) bằng JOIN.
 * Sắp xếp: changed_at desc (mới nhất trước).
 *
 * @param evaluationId - ID của Evaluation
 * @param teacherId - Teacher đang request (để authorize: phải sở hữu lớp chứa evaluation này)
 */
export async function listEvaluationHistory(
  evaluationId: string,
  teacherId: string,
): Promise<EvaluationHistoryDto[]> {
  const supabase = createAdminClient();

  // Bước 1: Xác minh Teacher có quyền truy cập Evaluation này
  // Authorization chain: evaluations → assignments → class_sections → teacher_id = teacherId
  const { data: evalData, error: evalError } = await supabase
    .from("evaluations")
    .select("id, assignments(class_sections(teacher_id))")
    .eq("id", evaluationId)
    .single();

  if (evalError || !evalData) {
    throw new Error("Không tìm thấy Evaluation");
  }

  // Kiểm tra quyền Teacher
  const classSection = (
    evalData as unknown as {
      assignments: { class_sections: { teacher_id: string } | null } | null;
    }
  ).assignments?.class_sections;

  if (!classSection || classSection.teacher_id !== teacherId) {
    throw new Error("Không có quyền truy cập lịch sử Evaluation này");
  }

  // Bước 2: Lấy history và JOIN với teachers để lấy display_name
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
