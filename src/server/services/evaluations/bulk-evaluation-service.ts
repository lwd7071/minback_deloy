import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { bulkEvaluationSchema } from "@/schemas/frontend-rebuild";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import { createEvaluationNotification } from "@/server/services/notifications/notification-service";

export async function bulkUpsertTeacherEvaluations(
  assignmentId: string,
  input: unknown,
): Promise<
  Array<{
    evaluationId: string;
    studentId: string;
    changeType: "created" | "updated";
  }>
> {
  const { supabase, teacher } = await requireTeacher();
  const parsed = bulkEvaluationSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Dữ liệu đánh giá không hợp lệ",
    );
  }
  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  if (
    parsed.data.evaluations.some(
      (row) => row.score !== null && row.score > assignment.maxScore,
    )
  ) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Điểm vượt quá điểm tối đa",
    );
  }
  const { data, error } = await supabase.rpc("bulk_upsert_evaluations", {
    p_assignment_id: assignmentId,
    p_rows: parsed.data.evaluations,
  });
  if (error) {
    if (error.code === "P0002") {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    if (["22023", "23505", "23514"].includes(error.code)) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu đánh giá không hợp lệ",
      );
    }
    throw new Error("BULK_EVALUATION_FAILED");
  }
  const changed = (data ?? []) as Array<{
    id: string;
    student_id: string;
    change_type: "created" | "updated";
  }>;
  // Wait for notification attempts to settle while keeping their failures isolated
  // from the already-committed evaluation result.
  await Promise.all(
    changed.map((row) =>
      createEvaluationNotification({
        studentId: row.student_id,
        evaluationId: row.id,
        type:
          row.change_type === "created"
            ? "evaluation_created"
            : "evaluation_updated",
        assignmentTitle: assignment.title,
      }).catch(() => {
        console.error("[BulkEvaluation] EVALUATION_NOTIFICATION_FAILED");
      }),
    ),
  );
  return changed.map((row) => ({
    evaluationId: row.id,
    studentId: row.student_id,
    changeType: row.change_type,
  }));
}
