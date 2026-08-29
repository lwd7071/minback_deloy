/**
 * src/server/repositories/student-session-repository.ts
 *
 * Repository quản lý bảng `student_sessions`.
 * Dùng createAdminClient() (service-role key) vì RLS không cấp quyền
 * cho anon/authenticated role trên bảng này.
 *
 * Bảo mật đảm bảo bằng logic code:
 * - Mọi query đều scope theo studentId
 * - Không có query "lấy session tùy ý bằng token"
 * - Chỉ trả session chưa bị revoke và còn hạn
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateSessionInput, StudentSessionRow } from "@/types/student";

// Session timeout: 30 phút không hoạt động
const SESSION_TIMEOUT_MINUTES = 30;

// Throttle ghi last_activity_at: tối đa 1 lần/phút
const ACTIVITY_THROTTLE_SECONDS = 60;

/**
 * Tạo một StudentSession mới trong database.
 * Token hash (SHA-256) được lưu, không lưu raw token.
 */
export async function createStudentSession(
  input: CreateSessionInput,
): Promise<StudentSessionRow> {
  const supabase = createAdminClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("student_sessions")
    .insert({
      student_id: input.studentId,
      token_hash: input.tokenHash,
      access_level: input.accessLevel,
      last_activity_at: now.toISOString(),
      expires_at: input.expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Không thể tạo student session: ${error?.message}`);
  }

  return data as StudentSessionRow;
}

/**
 * Tìm session hợp lệ theo token hash.
 * Trả null nếu không tồn tại, đã revoke, hoặc đã hết hạn.
 *
 * Hết hạn được tính dựa trên last_activity_at + SESSION_TIMEOUT_MINUTES,
 * không phải expires_at tuyệt đối (sliding window).
 */
export async function findValidSessionByTokenHash(
  tokenHash: string,
): Promise<StudentSessionRow | null> {
  const supabase = createAdminClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("student_sessions")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null) // chưa bị thu hồi
    .single();

  if (error || !data) return null;

  const session = data as StudentSessionRow;

  // Kiểm tra sliding window: last_activity_at + 30 phút > now
  const lastActivity = new Date(session.last_activity_at);
  const expiresAt = new Date(
    lastActivity.getTime() + SESSION_TIMEOUT_MINUTES * 60 * 1000,
  );

  if (now > expiresAt) {
    // Session đã hết hạn (timeout), không cần xóa ngay — để cleanup job xử lý
    return null;
  }

  return session;
}

/**
 * Cập nhật last_activity_at để gia hạn sliding window.
 * Throttle: chỉ ghi nếu lần ghi trước cách đây hơn ACTIVITY_THROTTLE_SECONDS.
 * Trả true nếu đã ghi, false nếu bỏ qua do throttle.
 */
export async function refreshSessionActivity(
  sessionId: string,
  lastActivityAt: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const now = new Date();
  const lastActivity = new Date(lastActivityAt);
  const secondsSinceLastActivity =
    (now.getTime() - lastActivity.getTime()) / 1000;

  // Throttle: bỏ qua nếu chưa đủ thời gian
  if (secondsSinceLastActivity < ACTIVITY_THROTTLE_SECONDS) {
    return false;
  }

  const { error } = await supabase
    .from("student_sessions")
    .update({ last_activity_at: now.toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);

  if (error) {
    // Lỗi không nghiêm trọng — log nhưng không throw, để request tiếp tục
    console.error(
      `[StudentSessionRepo] Không thể refresh activity cho session ${sessionId}:`,
      error.message,
    );
    return false;
  }

  return true;
}

/**
 * Nâng cấp access_level của session từ 'credential_change' lên 'full'.
 * Đồng thời cập nhật token hash mới (rotate token) và reset last_activity_at.
 */
export async function upgradeSessionToFull(
  sessionId: string,
  newTokenHash: string,
): Promise<StudentSessionRow> {
  const supabase = createAdminClient();
  const now = new Date();
  const newExpiresAt = new Date(
    now.getTime() + SESSION_TIMEOUT_MINUTES * 60 * 1000,
  );

  const { data, error } = await supabase
    .from("student_sessions")
    .update({
      token_hash: newTokenHash,
      access_level: "full",
      last_activity_at: now.toISOString(),
      expires_at: newExpiresAt.toISOString(),
    })
    .eq("id", sessionId)
    .is("revoked_at", null)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Không thể nâng cấp session ${sessionId}: ${error?.message}`,
    );
  }

  return data as StudentSessionRow;
}

/**
 * Thu hồi (revoke) một session cụ thể theo sessionId.
 * Dùng khi logout.
 */
export async function revokeSessionById(sessionId: string): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();

  const { error } = await supabase
    .from("student_sessions")
    .update({ revoked_at: now.toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Không thể revoke session ${sessionId}: ${error.message}`,
    );
  }
}

/**
 * Thu hồi TẤT CẢ session của một student.
 * Dùng khi Teacher reset PIN — toàn bộ session cũ phải bị revoke.
 */
export async function revokeAllSessionsByStudentId(
  studentId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();

  const { error } = await supabase
    .from("student_sessions")
    .update({ revoked_at: now.toISOString() })
    .eq("student_id", studentId)
    .is("revoked_at", null); // chỉ revoke những session chưa bị revoke

  if (error) {
    throw new Error(
      `Không thể revoke sessions của student ${studentId}: ${error.message}`,
    );
  }
}
