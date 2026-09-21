/**
 * src/server/repositories/notification-repository.ts
 *
 * Repository quản lý bảng `notifications`.
 * Dùng createAdminClient() vì Student không dùng Supabase Auth.
 *
 * Bảo mật: mọi query đều scope theo student_id được lấy từ session đã xác thực.
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { withServerTiming } from "@/server/lib/server-timing";
import type { NotificationDto, NotificationRow } from "@/types/notification";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách Notification của một Student với phân trang.
 * Sắp xếp: created_at desc (mới nhất trước).
 * Hỗ trợ lọc chỉ lấy chưa đọc (unreadOnly).
 * Response `meta` có thêm unreadCount.
 */
export async function listNotificationsByStudentId(
  studentId: string,
  classSectionId: string,
  options: {
    page: number;
    pageSize: number;
    unreadOnly: boolean;
  },
): Promise<{
  notifications: NotificationDto[];
  total: number;
  unreadCount: number;
}> {
  const supabase = createAdminClient();
  const { page, pageSize, unreadOnly } = options;
  const { data, error } = await withServerTiming(
    "/class/[code]/notifications",
    () =>
      supabase.rpc("list_student_notifications", {
        p_student_id: studentId,
        p_class_section_id: classSectionId,
        p_page: page,
        p_page_size: pageSize,
        p_unread_only: unreadOnly,
      }),
    (result) => (result.data as { rows?: unknown[] } | null)?.rows?.length,
  );

  if (error || !data) {
    throw new Error(
      `Không thể lấy danh sách Notification: ${error?.message ?? "empty response"}`,
    );
  }
  const result = data as unknown as {
    rows: NotificationRpcRow[];
    total: number;
    unread_count: number;
  };
  return {
    notifications: result.rows.map(toNotificationRpcDto),
    total: Number(result.total ?? 0),
    unreadCount: Number(result.unread_count ?? 0),
  };
}

/**
 * Tìm một Notification theo ID và studentId.
 * Bắt buộc scope theo studentId để tránh Student đọc notification của Student khác.
 */
export async function findNotificationById(
  notificationId: string,
  studentId: string,
  classSectionId: string,
): Promise<NotificationDto | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("list_student_notifications", {
    p_student_id: studentId,
    p_class_section_id: classSectionId,
    p_page: 1,
    p_page_size: 100,
    p_unread_only: false,
  });
  if (error || !data) return null;
  const row = (data as unknown as { rows: NotificationRpcRow[] }).rows.find(
    (item) => item.id === notificationId,
  );
  return row ? toNotificationRpcDto(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Đánh dấu một Notification là đã đọc (set read_at = now).
 * Bắt buộc scope theo studentId — Student không thể mark-read notification của Student khác.
 * Trả null nếu không tìm thấy (không tồn tại hoặc thuộc Student khác).
 */
export async function markNotificationAsRead(
  notificationId: string,
  studentId: string,
  classSectionId: string,
): Promise<NotificationDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("mark_student_notification_read", {
    p_notification_id: notificationId,
    p_student_id: studentId,
    p_class_section_id: classSectionId,
  });
  if (error) {
    throw new Error(`Không thể đánh dấu đã đọc Notification: ${error.message}`);
  }
  return data
    ? toNotificationRpcDto(data as unknown as NotificationRpcRow)
    : null;
}

type NotificationRpcRow = {
  id: string;
  type: NotificationRow["type"];
  message: string;
  evaluation_id: string | null;
  assignment_id: string | null;
  created_at: string;
  read_at: string | null;
};

function toNotificationRpcDto(row: NotificationRpcRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    evaluationId: row.evaluation_id,
    assignmentId: row.assignment_id,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}
