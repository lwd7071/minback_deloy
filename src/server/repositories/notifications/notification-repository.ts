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
import type { NotificationDto, NotificationRow } from "@/types/notification";

// ─── Mapper: DB row → DTO ─────────────────────────────────────────────────────

function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    evaluationId: row.evaluation_id,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách Notification của một Student với phân trang.
 * Sắp xếp: created_at desc (mới nhất trước).
 * Hỗ trợ lọc chỉ lấy chưa đọc (unreadOnly).
 * Response `meta` có thêm unreadCount.
 */
export async function listNotificationsByStudentId(
  studentId: string,
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
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("student_id", studentId) // bắt buộc scope theo student
    .order("created_at", { ascending: false })
    .range(from, to);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Không thể lấy danh sách Notification: ${error.message}`);
  }

  // Đếm riêng unreadCount (luôn đếm bất kể unreadOnly)
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .is("read_at", null);

  return {
    notifications: (data as NotificationRow[]).map(toNotificationDto),
    total: count ?? 0,
    unreadCount: unreadCount ?? 0,
  };
}

/**
 * Tìm một Notification theo ID và studentId.
 * Bắt buộc scope theo studentId để tránh Student đọc notification của Student khác.
 */
export async function findNotificationById(
  notificationId: string,
  studentId: string,
): Promise<NotificationDto | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .eq("student_id", studentId) // bắt buộc scope
    .maybeSingle();

  if (error || !data) return null;

  return toNotificationDto(data as NotificationRow);
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
): Promise<NotificationDto | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("student_id", studentId) // bắt buộc scope
    .is("read_at", null) // chỉ update nếu chưa đọc (idempotent nếu cần, bỏ dòng này)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể đánh dấu đã đọc Notification: ${error.message}`);
  }

  if (!data) return null;

  return toNotificationDto(data as NotificationRow);
}
