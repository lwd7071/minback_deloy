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
): Promise<{ emailSent: boolean }> {
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
    console.error("[Notification] Lỗi truy vấn Evaluation:", evaluationError);
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
    console.error("[Notification] Lỗi tạo in-app notification:", notificationError);
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể tạo thông báo",
    );
  }

  const student = context.students;
  const classSection = context.assignments?.class_sections;
  if (!student || !classSection) {
    console.warn("[Notification] Thiếu thông tin Student hoặc ClassSection:", { student, classSection });
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
      console.error("[Notification] Lỗi đọc cấu hình giáo viên:", teacherError);
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
    latestOldStatus = (history?.old_status as "pending" | "graded" | "returned") ?? null;
  }

  const shouldSend = shouldAttemptEvaluationEmail({
    type: input.type,
    currentStatus: context.status,
    latestOldStatus,
    emailEnabled,
    studentEmail: student.email,
    brevoConfigured: getBrevoPublicConfig().configured,
  });

  console.log("[Notification] Kiểm tra điều kiện gửi email:", {
    type: input.type,
    currentStatus: context.status,
    latestOldStatus,
    emailEnabled,
    studentEmail: student.email,
    brevoConfigured: getBrevoPublicConfig().configured,
    shouldSend,
  });

  if (!shouldSend) {
    return { emailSent: false };
  }

  const emailSent = await deliverEmailSafely(
    async () => {
      const result = await sendEvaluationEmail({
        recipientEmail: student.email!,
        studentFullName: student.full_name,
        assignmentTitle: context.assignments?.title ?? input.assignmentTitle,
        classCode: classSection.code,
        className: classSection.name,
      });
      console.log(`[Notification] Đã gửi email thành công tới ${student.email}, Brevo messageId: ${result.messageId}`);
      return result;
    },
    (code) => {
      console.error(`[Notification] Gửi email thất bại (${code}) tới ${student.email}`);
    },
  );
  return { emailSent };
}
