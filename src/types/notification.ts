/**
 * src/types/notification.ts
 *
 * Types cho Notification domain (thông báo sinh viên).
 */

// ─── DB Row Shapes ────────────────────────────────────────────────────────────
// Phản chiếu trực tiếp schema database (snake_case) của bảng student_notifications.
export type NotificationRow = {
  id: string;
  student_id: string;
  evaluation_id: string | null;
  type: "evaluation_created" | "evaluation_updated";
  message: string;
  created_at: string;
  read_at: string | null;
};

// ─── API DTOs (camelCase) ─────────────────────────────────────────────────────
export type NotificationDto = {
  id: string;
  type: "evaluation_created" | "evaluation_updated";
  message: string;
  evaluationId: string | null;
  createdAt: string;
  readAt: string | null;
};
