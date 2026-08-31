import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { shouldAttemptEvaluationEmail } from "@/server/services/notifications/email-notification-policy";
import {
  getBrevoPublicConfig,
  sendEvaluationEmail,
} from "@/server/services/notifications/email/brevo-email-service";
import { deliverEmailSafely } from "@/server/services/notifications/email/safe-email-delivery";

type EvaluationNotificationInput = {
  studentId: string;
  evaluationId: string;
  type: "evaluation_created" | "evaluation_updated";
  assignmentTitle: string;
};

type EvaluationContext = {
  status: "pending" | "graded" | "returned";
  students: { email: string | null; full_name: string } | null;
  assignments: {
    title: string;
    class_sections: { code: string; name: string; teacher_id: string } | null;
  } | null;
};

export async function createEvaluationNotification(
  input: EvaluationNotificationInput,
): Promise<void> {
  const supabase = await createClient();
  const { data: evaluation, error: evaluationError } = await supabase
    .from("evaluations")
    .select(
      "status, students(email, full_name), assignments(title, class_sections(code, name, teacher_id, teachers(email_notification_enabled)))",
    )
    .eq("id", input.evaluationId)
    .eq("student_id", input.studentId)
    .single();

  if (evaluationError || !evaluation) {
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không tải được dữ liệu Evaluation để tạo thông báo",
    );
  }

  const context = evaluation as unknown as EvaluationContext & {
    assignments: EvaluationContext["assignments"] & {
      class_sections: {
        code: string;
        name: string;
        teacher_id: string;
        teachers: { email_notification_enabled: boolean } | null;
      } | null;
    };
  };

  if (context.status === "pending") return;

  const message = `Kết quả bài tập "${input.assignmentTitle}" đã được cập nhật.`;
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      student_id: input.studentId,
      evaluation_id: input.evaluationId,
      type: input.type,
      message,
    });

  if (notificationError) {
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể tạo thông báo",
    );
  }

  const student = context.students;
  const classSection = context.assignments?.class_sections;
  const emailEnabled = Boolean(
    classSection?.teachers?.email_notification_enabled,
  );

  if (!student || !classSection) return;

  let latestOldStatus: "pending" | "graded" | "returned" | null = null;
  if (input.type === "evaluation_updated") {
    const { data: history } = await supabase
      .from("evaluation_history")
      .select("old_status")
      .eq("evaluation_id", input.evaluationId)
      .order("changed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestOldStatus = history?.old_status ?? null;
  }

  if (
    !shouldAttemptEvaluationEmail({
      type: input.type,
      currentStatus: context.status,
      latestOldStatus,
      emailEnabled,
      studentEmail: student.email,
      brevoConfigured: getBrevoPublicConfig().configured,
    })
  ) {
    return;
  }

  await deliverEmailSafely(() =>
    sendEvaluationEmail({
      recipientEmail: student.email!,
      studentFullName: student.full_name,
      assignmentTitle: context.assignments?.title ?? input.assignmentTitle,
      classCode: classSection.code,
      className: classSection.name,
    }),
  );
}
