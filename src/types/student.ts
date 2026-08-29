/**
 * src/types/student.ts
 *
 * TypeScript types cho toàn bộ Student domain.
 * Đây là nguồn sự thật về kiểu dữ liệu — tất cả service, repository
 * và API route handler đều import từ đây.
 *
 * Không import file này ở browser client (chứa shape của DB row).
 */

// ─── DB Row Shapes ────────────────────────────────────────────────────────────
// Phản chiếu trực tiếp schema database (snake_case).
// Chỉ dùng trong repository layer, không expose ra ngoài API.

export type StudentRow = {
  id: string;
  class_section_id: string;
  mssv: string;
  full_name: string;
  email: string | null;
  nickname: string;
  pin_hash: string;
  must_change_nickname: boolean;
  must_change_pin: boolean;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentSessionRow = {
  id: string;
  student_id: string;
  token_hash: string; // SHA-256 hex của raw token
  access_level: "credential_change" | "full";
  last_activity_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type LoginRateLimitRow = {
  id: string;
  scope: "identifier" | "ip";
  key_hash: string; // HMAC-SHA256 hex của IP hoặc "classCode:nickname"
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  student_id: string;
  evaluation_id: string | null;
  type: "evaluation_created" | "evaluation_updated";
  message: string;
  created_at: string;
  read_at: string | null;
};

export type EvaluationHistoryRow = {
  id: string;
  evaluation_id: string;
  old_score: number | null;
  old_feedback: string;
  old_status: "pending" | "graded" | "returned";
  changed_at: string;
  changed_by: string; // teacher_id
};

// ─── API DTOs (camelCase, expose ra ngoài API) ────────────────────────────────
// Đây là các type được dùng trong response body của API.
// Contract khóa — không thay đổi tên field.

export type StudentSessionDto = {
  student: {
    id: string;
    classSectionId: string;
    mssv: string;
    fullName: string;
    nickname: string;
  };
  accessLevel: "credential_change" | "full";
  mustChangeNickname: boolean;
  mustChangePin: boolean;
  expiresAt: string;
};

export type StudentAdminDto = {
  id: string;
  classSectionId: string;
  mssv: string;
  fullName: string;
  email: string | null;
  nickname: string;
  mustChangeNickname: boolean;
  mustChangePin: boolean;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationDto = {
  id: string;
  type: "evaluation_created" | "evaluation_updated";
  message: string;
  evaluationId: string | null;
  createdAt: string;
  readAt: string | null;
};

export type EvaluationHistoryDto = {
  id: string;
  evaluationId: string;
  oldScore: number | null;
  oldFeedback: string;
  oldStatus: "pending" | "graded" | "returned";
  changedAt: string;
  changedBy: {
    id: string;
    displayName: string;
  };
};

// ─── Internal types dùng trong service layer ──────────────────────────────────

/** Kết quả sau khi verify session từ cookie — dùng nội bộ trong student-session.ts */
export type VerifiedStudentSession = {
  sessionId: string;
  studentId: string;
  classSectionId: string;
};

/** Input để tạo StudentSession mới trong DB */
export type CreateSessionInput = {
  studentId: string;
  tokenHash: string;
  accessLevel: "credential_change" | "full";
  expiresAt: Date;
};
