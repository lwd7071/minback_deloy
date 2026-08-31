/**
 * src/server/auth/student-session.ts
 *
 * Public module Dev B cung cấp cho Dev A.
 * Export chính: requireFullStudentSession()
 *
 * Contract khóa từ docs/team/dev-b-assignment.md mục 2.6:
 *   export async function requireFullStudentSession(): Promise<{
 *     sessionId: string;
 *     studentId: string;
 *     classSectionId: string;
 *   }>;
 *
 * Luồng xử lý:
 * 1. Đọc cookie 'minback_student_session' từ request context
 * 2. Decode base64url → raw token → SHA-256 hash
 * 3. Tìm session hợp lệ trong DB (chưa revoke, trong sliding window)
 * 4. Kiểm tra access_level phải là 'full'
 * 5. Throttled update last_activity_at (tối đa 1 lần/phút)
 * 6. Trả { sessionId, studentId, classSectionId }
 *
 * Các hàm internal (generateRawToken, hashToken, buildSessionDto) được export
 * để dùng trong student-auth-service.ts.
 */

import "server-only";

import { createHash, randomBytes } from "crypto";

import { cookies } from "next/headers";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  findValidSessionByTokenHash,
  refreshSessionActivity,
} from "@/server/repositories/student-session-repository";
import { findStudentRowById } from "@/server/repositories/student-repository";
import type {
  StudentSessionDto,
  VerifiedStudentSession,
} from "@/types/student";

/** Tên cookie chứa raw session token */
export const STUDENT_SESSION_COOKIE = "minback_student_session";

/** Thời gian sống của session: 30 phút */
export const SESSION_TIMEOUT_MINUTES = 30;

// ─── Token utilities ──────────────────────────────────────────────────────────

/**
 * Sinh raw token ngẫu nhiên 32 bytes, encode base64url.
 * Raw token này sẽ được set vào cookie (HttpOnly + Secure).
 * Database chỉ lưu SHA-256 hash của raw token.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash raw token bằng SHA-256.
 * Giá trị trả về là hex string (64 ký tự) — đây là giá trị lưu vào DB.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Tính thời điểm hết hạn session (now + SESSION_TIMEOUT_MINUTES).
 */
export function computeSessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000);
}

// ─── Cookie utilities ─────────────────────────────────────────────────────────

/** Options chuẩn cho cookie Student Session */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TIMEOUT_MINUTES * 60,
};

// ─── DTO builder ──────────────────────────────────────────────────────────────

/**
 * Xây dựng StudentSessionDto từ DB data.
 * Dùng trong response của login, session GET, credentials PATCH.
 */
export async function buildStudentSessionDto(
  sessionId: string,
  studentId: string,
  accessLevel: "credential_change" | "full",
  expiresAt: string,
): Promise<StudentSessionDto> {
  const student = await findStudentRowById(studentId);

  if (!student) {
    throw new ApiError(
      401,
      API_ERROR_CODES.sessionExpired,
      "Không tìm thấy thông tin sinh viên",
    );
  }

  return {
    student: {
      id: student.id,
      classSectionId: student.class_section_id,
      mssv: student.mssv,
      fullName: student.full_name,
      nickname: student.nickname,
    },
    accessLevel,
    mustChangeNickname: student.must_change_nickname,
    mustChangePin: student.must_change_pin,
    expiresAt,
  };
}

// ─── Core: requireStudentSession (internal, dùng bởi cả full và credential_change) ──

/**
 * Đọc và xác thực StudentSession từ cookie.
 * Trả session info nếu hợp lệ, throw ApiError nếu không.
 *
 * KHÔNG kiểm tra access_level — hàm này dùng nội bộ.
 * Hàm public requireFullStudentSession() wrap hàm này và thêm kiểm tra access_level.
 */
async function requireStudentSession(): Promise<
  VerifiedStudentSession & {
    accessLevel: "credential_change" | "full";
    expiresAt: string;
  }
> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;

  if (!rawToken) {
    throw new ApiError(
      401,
      API_ERROR_CODES.unauthenticated,
      "Vui lòng đăng nhập để tiếp tục",
    );
  }

  const tokenHash = hashToken(rawToken);
  const session = await findValidSessionByTokenHash(tokenHash);

  if (!session) {
    throw new ApiError(
      401,
      API_ERROR_CODES.sessionExpired,
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
    );
  }

  // Lấy classSectionId từ bảng students (cần cho authorization)
  const student = await findStudentRowById(session.student_id);

  if (!student) {
    throw new ApiError(
      401,
      API_ERROR_CODES.sessionExpired,
      "Phiên đăng nhập không hợp lệ",
    );
  }

  // Throttled activity refresh (tối đa 1 lần/phút — không block request nếu lỗi)
  await refreshSessionActivity(session.id, session.last_activity_at);

  return {
    sessionId: session.id,
    studentId: session.student_id,
    classSectionId: student.class_section_id,
    accessLevel: session.access_level,
    expiresAt: session.expires_at,
  };
}

// ─── Public API (contract với Dev A) ─────────────────────────────────────────

/**
 * ✅ PUBLIC MODULE — Dev A import và dùng hàm này.
 *
 * Xác thực StudentSession với access_level='full'.
 * - Đọc cookie 'minback_student_session'
 * - Verify token hash + sliding window expiry + revocation check
 * - Kiểm tra access_level phải là 'full' (không phải 'credential_change')
 * - Throttled update last_activity_at
 *
 * @throws ApiError 401 UNAUTHENTICATED - Không có cookie
 * @throws ApiError 401 SESSION_EXPIRED - Session hết hạn hoặc đã bị revoke
 * @throws ApiError 403 CREDENTIAL_CHANGE_REQUIRED - Session đang ở credential_change
 */
export async function requireFullStudentSession(): Promise<VerifiedStudentSession> {
  const session = await requireStudentSession();

  if (session.accessLevel !== "full") {
    throw new ApiError(
      403,
      API_ERROR_CODES.credentialChangeRequired,
      "Vui lòng đổi thông tin đăng nhập trước khi tiếp tục",
    );
  }

  return {
    sessionId: session.sessionId,
    studentId: session.studentId,
    classSectionId: session.classSectionId,
  };
}

/**
 * Xác thực StudentSession cho các endpoint credential change.
 * Cho phép cả access_level='credential_change' và 'full'.
 * Dùng trong: GET /auth/session, PATCH /auth/credentials, POST /auth/logout.
 */
export async function requireAnyStudentSession(): Promise<
  VerifiedStudentSession & {
    accessLevel: "credential_change" | "full";
    expiresAt: string;
  }
> {
  return requireStudentSession();
}
