/**
 * src/server/services/student-auth-service.ts
 *
 * Business logic cho Student Authentication.
 * Orchestrate: Rate-limit check → DB query → BCrypt verify → Session creation.
 *
 * Nguyên tắc bảo mật:
 * - Sai ở bất kỳ bước nào cũng trả 401 INVALID_CREDENTIALS (thông báo chung)
 * - Tăng cả hai bucket rate-limit khi sai
 * - Không log PIN, hash, token hoặc thông tin nhạy cảm
 * - IP lấy từ Next.js request, normalize trước khi hash
 */

import "server-only";

import { compare, hash } from "bcrypt";
import { randomInt } from "crypto";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  buildIdentifierHash,
  buildIpHash,
  checkBothBuckets,
  incrementBothBuckets,
  resetIdentifierBucket,
} from "@/server/repositories/login-rate-limit-repository";
import {
  findClassSectionIdByCode,
  findStudentByNicknameAndClass,
  findStudentRowById,
  resetStudentFailedLogin,
  updateStudentNickname,
  updateStudentPin,
  updateStudentPinHash,
} from "@/server/repositories/student-repository";
import {
  createStudentSession,
  revokeAllSessionsByStudentId,
  revokeSessionById,
  upgradeSessionToFull,
} from "@/server/repositories/student-session-repository";
import {
  SESSION_COOKIE_OPTIONS,
  SESSION_TIMEOUT_MINUTES,
  STUDENT_SESSION_COOKIE,
  buildStudentSessionDto,
  computeSessionExpiresAt,
  generateRawToken,
  hashToken,
} from "@/server/auth/student-session";
import type { StudentSessionDto } from "@/types/student";
import type { StudentLoginInput, CredentialsUpdateInput } from "@/schemas/student-auth";

// BCrypt cost factor — 10 là mức chuẩn (balance giữa bảo mật và performance)
const BCRYPT_ROUNDS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize IP address từ request header.
 * Lấy IP đầu tiên từ X-Forwarded-For hoặc dùng fallback.
 */
export function normalizeIp(rawIp: string | null): string {
  if (!rawIp) return "unknown";
  // X-Forwarded-For có thể là "client, proxy1, proxy2" — lấy client IP đầu tiên
  const firstIp = rawIp.split(",")[0].trim();
  return firstIp || "unknown";
}

/**
 * Sinh PIN 6 chữ số ngẫu nhiên bằng CSPRNG.
 * Đảm bảo đúng 6 chữ số (000000–999999), zero-padded.
 */
export function generateRandomPin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Xử lý luồng đăng nhập Student.
 *
 * Luồng (theo contract mục 2.3):
 * 1. Normalize classCode và nickname
 * 2. Kiểm tra rate-limit (IP + identifier) → 429 nếu bị block
 * 3. Resolve classSectionId từ classCode
 * 4. Query Student bằng nickname + classSectionId
 * 5. Verify BCrypt PIN
 * 6. Bước 3-5 sai → 401 INVALID_CREDENTIALS + tăng cả hai bucket
 * 7. Đăng nhập thành công → reset identifier bucket + failed_login_count
 * 8. Tạo session với access_level phù hợp
 * 9. Trả raw token (set vào cookie ở Route Handler) + DTO
 *
 * @returns { rawToken, dto } — rawToken để set vào cookie, dto để trả về API
 */
export async function loginStudent(
  input: StudentLoginInput,
  rawIp: string | null,
): Promise<{
  rawToken: string;
  cookieOptions: typeof SESSION_COOKIE_OPTIONS;
  cookieName: typeof STUDENT_SESSION_COOKIE;
  dto: StudentSessionDto;
}> {
  // classCode đã được normalize (uppercase + trim) bởi Zod schema
  // nickname đã được trim bởi Zod schema
  const { classCode, nickname, pin } = input;

  // Bước 2: Kiểm tra rate-limit TRƯỚC khi query DB
  const normalizedIp = normalizeIp(rawIp);
  const ipHash = buildIpHash(normalizedIp);
  const identifierHash = buildIdentifierHash(classCode, nickname);

  const { ipBlocked, identifierBlocked } = await checkBothBuckets(
    ipHash,
    identifierHash,
  );

  if (ipBlocked || identifierBlocked) {
    throw new ApiError(
      429,
      API_ERROR_CODES.loginRateLimited,
      "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
    );
  }

  // Bước 3–5: Query và verify (mọi lỗi đều trả cùng một message)
  const classSectionId = await findClassSectionIdByCode(classCode);

  if (!classSectionId) {
    // Tăng cả hai bucket trước khi trả lỗi chung
    await incrementBothBuckets(ipHash, identifierHash);
    throw new ApiError(
      401,
      API_ERROR_CODES.invalidCredentials,
      "Thông tin đăng nhập không chính xác",
    );
  }

  const student = await findStudentByNicknameAndClass(nickname, classSectionId);

  if (!student) {
    await incrementBothBuckets(ipHash, identifierHash);
    throw new ApiError(
      401,
      API_ERROR_CODES.invalidCredentials,
      "Thông tin đăng nhập không chính xác",
    );
  }

  // Verify BCrypt PIN
  const pinValid = await compare(pin, student.pin_hash);

  if (!pinValid) {
    await incrementBothBuckets(ipHash, identifierHash);
    throw new ApiError(
      401,
      API_ERROR_CODES.invalidCredentials,
      "Thông tin đăng nhập không chính xác",
    );
  }

  // Bước 7: Đăng nhập thành công — reset rate-limit và failed_login_count
  await Promise.all([
    resetIdentifierBucket(identifierHash),
    resetStudentFailedLogin(student.id),
  ]);

  // Bước 8: Xác định access_level
  const needsCredentialChange =
    student.must_change_nickname || student.must_change_pin;
  const accessLevel = needsCredentialChange ? "credential_change" : "full";

  // Bước 9: Tạo session
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = computeSessionExpiresAt();

  const session = await createStudentSession({
    studentId: student.id,
    tokenHash,
    accessLevel,
    expiresAt,
  });

  const dto = await buildStudentSessionDto(
    session.id,
    student.id,
    accessLevel,
    session.expires_at,
  );

  return {
    rawToken,
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookieName: STUDENT_SESSION_COOKIE,
    dto,
  };
}

// ─── Credentials Update ────────────────────────────────────────────────────────

/**
 * Xử lý đổi credentials (nickname và/hoặc PIN) của Student.
 * Chỉ được gọi khi session đang ở access_level='credential_change' hoặc 'full'.
 *
 * Luồng:
 * 1. Validate từng field được gửi lên
 * 2. Cập nhật vào DB
 * 3. Kiểm tra sau khi update: nếu tất cả flag must_change_* = false → rotate session lên 'full'
 * 4. Trả DTO mới (có raw token mới nếu rotate)
 *
 * @returns { rawToken?: string; dto } — rawToken chỉ có nếu session được rotate lên 'full'
 */
export async function updateStudentCredentials(
  sessionId: string,
  studentId: string,
  classSectionId: string,
  currentAccessLevel: "credential_change" | "full",
  input: CredentialsUpdateInput,
): Promise<{
  rawToken?: string;
  cookieOptions: typeof SESSION_COOKIE_OPTIONS;
  cookieName: typeof STUDENT_SESSION_COOKIE;
  dto: StudentSessionDto;
}> {
  const { nickname, pin } = input;

  // Cập nhật từng field nếu có trong request
  if (nickname !== undefined) {
    const updated = await updateStudentNickname(
      studentId,
      classSectionId,
      nickname,
    );

    if (!updated) {
      throw new ApiError(
        409,
        API_ERROR_CODES.conflict,
        "Nickname này đã được sử dụng trong lớp. Vui lòng chọn nickname khác.",
      );
    }
  }

  if (pin !== undefined) {
    const newPinHash = await hash(pin, BCRYPT_ROUNDS);
    await updateStudentPin(studentId, newPinHash);
  }

  // Kiểm tra trạng thái sau khi update
  const updatedStudent = await findStudentRowById(studentId);

  if (!updatedStudent) {
    throw new ApiError(
      401,
      API_ERROR_CODES.sessionExpired,
      "Không tìm thấy thông tin sinh viên",
    );
  }

  const allFlagsCleared =
    !updatedStudent.must_change_nickname && !updatedStudent.must_change_pin;

  // Nếu đang ở credential_change VÀ đã đổi đủ → rotate session lên 'full'
  if (currentAccessLevel === "credential_change" && allFlagsCleared) {
    const newRawToken = generateRawToken();
    const newTokenHash = hashToken(newRawToken);

    const upgradedSession = await upgradeSessionToFull(sessionId, newTokenHash);

    const dto = await buildStudentSessionDto(
      upgradedSession.id,
      studentId,
      "full",
      upgradedSession.expires_at,
    );

    return {
      rawToken: newRawToken,
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookieName: STUDENT_SESSION_COOKIE,
      dto,
    };
  }

  // Chưa đổi đủ hoặc đã ở 'full' — giữ nguyên session, chỉ trả DTO mới
  const accessLevel = allFlagsCleared ? "full" : "credential_change";
  const dto = await buildStudentSessionDto(
    sessionId,
    studentId,
    accessLevel,
    new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000).toISOString(),
  );

  return {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookieName: STUDENT_SESSION_COOKIE,
    dto,
  };
}

// ─── Logout ────────────────────────────────────────────────────────────────────

/**
 * Logout: revoke session trong DB và xóa cookie.
 * @param sessionId - Session ID từ requireAnyStudentSession()
 */
export async function logoutStudent(sessionId: string): Promise<void> {
  await revokeSessionById(sessionId);
}

// ─── Reset PIN (by Teacher) ────────────────────────────────────────────────────

/**
 * Teacher reset PIN của một Student.
 * Luồng:
 * 1. Sinh PIN 6 số CSPRNG
 * 2. Hash BCrypt
 * 3. Update pin_hash + set must_change_pin=true trong DB
 * 4. Revoke TẤT CẢ session cũ của Student
 * 5. Trả initialPin (plain text) — chỉ hiển thị một lần duy nhất
 *
 * @returns { initialPin: string } — raw PIN để Teacher phân phối
 */
export async function resetStudentPin(studentId: string): Promise<{
  initialPin: string;
}> {
  const initialPin = generateRandomPin();
  const newPinHash = await hash(initialPin, BCRYPT_ROUNDS);

  // Bước 1: Update PIN — bắt buộc thành công; throw nếu fail
  await updateStudentPinHash(studentId, newPinHash);

  // Bước 2: Revoke sessions — xử lý riêng để partial failure không block kết quả.
  // Nếu revoke fail (hiếm gặp, thường do network), session cũ vẫn tự hết hạn
  // sau SESSION_TIMEOUT_MINUTES — bảo mật vẫn đảm bảo vì PIN đã thay đổi.
  try {
    await revokeAllSessionsByStudentId(studentId);
  } catch (err) {
    // Log cảnh báo nhưng không throw — không để lỗi revoke rollback reset PIN đã thành công
    console.error("[resetStudentPin] Không thể revoke sessions của student:", studentId, err);
  }

  return { initialPin };
}
