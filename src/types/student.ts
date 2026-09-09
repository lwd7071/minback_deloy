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

// ─── Re-exports for Backward Compatibility ──────────────────────────────────
// Đảm bảo không làm gãy các import hiện có trong codebase.
export type { NotificationDto, NotificationRow } from "./notification";
export type { LoginRateLimitRow } from "./rate-limit";
export type {
  EvaluationHistoryDto,
  EvaluationHistoryRow,
} from "./evaluation";

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
