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
} from "@/server/repositories/students/login-rate-limit-repository";
import {
  findClassSectionIdByCode,
  findStudentByIdentifierAndClass,
  findStudentByMssvAndClass,
  findStudentRowById,
  resetStudentFailedLogin,
  updateStudentNickname,
  updateStudentPin,
  updateStudentPinHash,
} from "@/server/repositories/students/student-repository";
import {
  createForgotPinChallenge,
  verifyForgotPinOtp,
  revokeForgotPinChallenge,
} from "@/server/repositories/students/password-reset-challenge-repository";
import { sendForgotPinOtpEmail } from "@/server/services/notifications/email/brevo-email-service";
import { deliverEmailSafely } from "@/server/services/notifications/email/safe-email-delivery";
import {
  createStudentSession,
  revokeAllSessionsByStudentId,
  revokeSessionById,
  upgradeSessionToFull,
} from "@/server/repositories/students/student-session-repository";
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
import type {
  StudentLoginInput,
  CredentialsUpdateInput,
  ForgotPinRequestInput,
  ForgotPinConfirmInput,
} from "@/schemas/student-auth";

// BCrypt cost factor — 10 là mức chuẩn (balance giữa bảo mật và performance)
const BCRYPT_ROUNDS = 10;
export const DEFAULT_INITIAL_PIN = "111111";

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
  const { classCode, pin } = input;
  const identifier = (input.identifier || input.nickname || "").trim();

  // Bước 2: Kiểm tra rate-limit TRƯỚC khi query DB
  const normalizedIp = normalizeIp(rawIp);
  const ipHash = buildIpHash(normalizedIp);
  const identifierHash = buildIdentifierHash(classCode, identifier);

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

  const student = await findStudentByIdentifierAndClass(
    identifier,
    classSectionId,
  );

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
 * Teacher reset PIN của một Student về mã PIN mặc định 111111.
 * Bật cờ must_change_pin = true và revoke mọi session cũ.
 */
export async function resetStudentPinToDefault(
  studentId: string,
): Promise<{ studentId: string; mustChangePin: boolean }> {
  const newPinHash = await hash(DEFAULT_INITIAL_PIN, BCRYPT_ROUNDS);

  await revokeAllSessionsByStudentId(studentId);
  await updateStudentPinHash(studentId, newPinHash);
  await revokeForgotPinChallenge(studentId);

  return { studentId, mustChangePin: true };
}

/**
 * Teacher reset PIN ngẫu nhiên (legacy compat).
 */
export async function resetStudentPin(studentId: string): Promise<{
  initialPin: string;
}> {
  const initialPin = generateRandomPin();
  const newPinHash = await hash(initialPin, BCRYPT_ROUNDS);

  await revokeAllSessionsByStudentId(studentId);
  await updateStudentPinHash(studentId, newPinHash);

  return { initialPin };
}

// ─── Forgot PIN (OTP via Email) ────────────────────────────────────────────────

/**
 * Yêu cầu gửi OTP khôi phục mã PIN qua email.
 */
export async function requestForgotPinOtp(
  input: ForgotPinRequestInput,
  rawIp: string | null,
): Promise<{ message: string }> {
  const { classCode, mssv } = input;
  const normalizedIp = normalizeIp(rawIp);
  const ipHash = buildIpHash(normalizedIp);
  const identifierHash = buildIdentifierHash(classCode, mssv);

  const { ipBlocked, identifierBlocked } = await checkBothBuckets(
    ipHash,
    identifierHash,
  );

  if (ipBlocked || identifierBlocked) {
    throw new ApiError(
      429,
      API_ERROR_CODES.loginRateLimited,
      "Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
    );
  }

  const classSectionId = await findClassSectionIdByCode(classCode);
  if (!classSectionId) {
    // Không tiết lộ thông tin sự tồn tại của lớp/MSSV
    return {
      message: "Nếu thông tin chính xác, mã OTP đã được gửi đến email của bạn.",
    };
  }

  const student = await findStudentByMssvAndClass(mssv, classSectionId);
  if (!student) {
    return {
      message: "Nếu thông tin chính xác, mã OTP đã được gửi đến email của bạn.",
    };
  }

  // Tạo OTP và gửi email
  const { otp } = await createForgotPinChallenge(student.id);

  const recipientEmail =
    student.email && student.email.trim()
      ? student.email.trim()
      : `${student.mssv.toLowerCase()}@student.hcmute.edu.vn`;

  void deliverEmailSafely(() =>
    sendForgotPinOtpEmail(recipientEmail, student.full_name, otp),
  );

  return {
    message: "Nếu thông tin chính xác, mã OTP đã được gửi đến email của bạn.",
  };
}

/**
 * Xác nhận OTP và đặt mã PIN mới cho sinh viên.
 */
export async function confirmForgotPinOtp(
  input: ForgotPinConfirmInput,
  rawIp: string | null,
): Promise<{ message: string }> {
  const { classCode, mssv, otp, newPin } = input;
  const normalizedIp = normalizeIp(rawIp);
  const ipHash = buildIpHash(normalizedIp);
  const identifierHash = buildIdentifierHash(classCode, mssv);

  const { ipBlocked, identifierBlocked } = await checkBothBuckets(
    ipHash,
    identifierHash,
  );

  if (ipBlocked || identifierBlocked) {
    throw new ApiError(
      429,
      API_ERROR_CODES.loginRateLimited,
      "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.",
    );
  }

  const classSectionId = await findClassSectionIdByCode(classCode);
  if (!classSectionId) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Mã OTP không hợp lệ hoặc đã hết hạn",
    );
  }

  const student = await findStudentByMssvAndClass(mssv, classSectionId);
  if (!student) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Mã OTP không hợp lệ hoặc đã hết hạn",
    );
  }

  const verifyResult = await verifyForgotPinOtp(student.id, otp);
  if (!verifyResult.valid) {
    await incrementBothBuckets(ipHash, identifierHash);
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      verifyResult.reason === "EXPIRED"
        ? "Mã OTP đã hết hạn (chỉ có hiệu lực trong 10 phút)"
        : verifyResult.reason === "TOO_MANY_ATTEMPTS"
          ? "Bạn đã nhập sai OTP quá 5 lần. Vui lòng yêu cầu mã mới."
          : "Mã OTP không chính xác",
    );
  }

  // Cập nhật PIN mới và revoke mọi session cũ
  const newPinHash = await hash(newPin, BCRYPT_ROUNDS);
  await revokeAllSessionsByStudentId(student.id);
  await updateStudentPin(student.id, newPinHash);

  // Reset rate limit identifier bucket
  await resetIdentifierBucket(identifierHash);

  return {
    message: "Đặt lại mã PIN thành công. Bạn có thể đăng nhập bằng mã PIN mới.",
  };
}
