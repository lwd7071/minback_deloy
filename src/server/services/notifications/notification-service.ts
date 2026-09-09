import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { shouldAttemptEvaluationEmail } from "@/server/services/notifications/email-notification-policy";
import type { EmailNotificationAdapter } from "@/server/services/notifications/contracts/notification-adapter";
import { defaultEmailAdapter } from "@/server/services/notifications/adapters/brevo-email-adapter";
import { deliverEmailSafely } from "@/server/services/notifications/email/safe-email-delivery";

type EvaluationNotificationInput = {
  studentId: string;
  evaluationId: string;
  type: "evaluation_created" | "evaluation_updated";
  assignmentTitle: string;
};

export type EvaluationNotificationOptions = {
  emailAdapter?: EmailNotificationAdapter;
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
  options?: EvaluationNotificationOptions,
): Promise<{ emailSent: boolean }> {
  // Dependency Inversion: Sử dụng adapter trừu tượng được inject hoặc dùng default adapter
  const emailAdapter = options?.emailAdapter ?? defaultEmailAdapter;
  const supabase = await createClient();

  // Truy vấn evaluation, student và assignment/class_section
  const { data: evaluation, error: evaluationError } = await supabase
    .from("evaluations")
    .select(
      "status, students(email, full_name), assignments(title, class_sections(code, name, teacher_id))",
    )
    .eq("id", input.evaluationId)
    .eq("student_id", input.studentId)
    .single();

  if (evaluationError || !evaluation) {
    console.error("[Notification] EVALUATION_LOOKUP_FAILED");
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không tải được dữ liệu Evaluation để tạo thông báo",
    );
  }

  const context = evaluation as unknown as EvaluationContext;

  // Nếu bài tập vẫn đang ở trạng thái pending, không phát sinh thông báo
  if (context.status === "pending") return { emailSent: false };

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
    console.error("[Notification] IN_APP_NOTIFICATION_CREATE_FAILED");
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể tạo thông báo",
    );
  }

  const student = context.students;
  const classSection = context.assignments?.class_sections;
  if (!student || !classSection) {
    console.warn("[Notification] Thiếu thông tin Student hoặc ClassSection:", {
      student,
      classSection,
    });
    return { emailSent: false };
  }

  // Lấy trạng thái bật/tắt email của giáo viên sở hữu lớp học phần
  let emailEnabled = false;
  if (classSection.teacher_id) {
    const { data: teacherData, error: teacherError } = await supabase
      .from("teachers")
      .select("email_notification_enabled")
      .eq("id", classSection.teacher_id)
      .maybeSingle();

    if (teacherError) {
      console.error("[Notification] TEACHER_NOTIFICATION_CONFIG_LOOKUP_FAILED");
    }
    emailEnabled = Boolean(teacherData?.email_notification_enabled);
  }

  // Lấy trạng thái trước đó (nếu là cập nhật)
  let latestOldStatus: "pending" | "graded" | "returned" | null = null;
  if (input.type === "evaluation_updated") {
    const { data: history } = await supabase
      .from("evaluation_history")
      .select("old_status")
      .eq("evaluation_id", input.evaluationId)
      .order("changed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestOldStatus =
      (history?.old_status as "pending" | "graded" | "returned") ?? null;
  }

  const shouldSend = shouldAttemptEvaluationEmail({
    type: input.type,
    currentStatus: context.status,
    latestOldStatus,
    emailEnabled,
    studentEmail: student.email,
    emailConfigured: emailAdapter.isConfigured(),
  });

  if (!shouldSend) {
    return { emailSent: false };
  }

  const emailSent = await deliverEmailSafely(
    async () => {
      const result = await emailAdapter.sendEvaluationEmail({
        recipientEmail: student.email!,
        studentFullName: student.full_name,
        assignmentTitle: context.assignments?.title ?? input.assignmentTitle,
        classCode: classSection.code,
        className: classSection.name,
      });

      if (!result.success) {
        throw new Error(result.error ?? "EMAIL_DELIVERY_FAILED");
      }

      return result;
    },
    (code) => {
      console.error(`[Notification] ${code} provider=${emailAdapter.id}`);
    },
  );
  return { emailSent };
}
