import "server-only";

import { compare, hash } from "bcrypt";
import { randomInt } from "crypto";

type ChallengeRecord = {
  studentId: string;
  otpHash: string;
  expiresAt: number;
  failedAttempts: number;
  createdAt: number;
};

// Map lưu trữ OTP challenge trong bộ nhớ có TTL và giới hạn thử sai
const challengeStore = new Map<string, ChallengeRecord>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 phút
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Dọn dẹp các challenge đã hết hạn
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [studentId, record] of challengeStore.entries()) {
    if (record.expiresAt < now) {
      challengeStore.delete(studentId);
    }
  }
}

/**
 * Sinh mã OTP 6 số ngẫu nhiên CSPRNG
 */
export function generateOtp(): string {
  return String(randomInt(100_000, 1_000_000));
}

/**
 * Tạo challenge mới cho sinh viên (mã mới vô hiệu hóa mã cũ)
 */
export async function createForgotPinChallenge(studentId: string): Promise<{ otp: string; expiresAt: Date }> {
  cleanupExpired();
  const otp = generateOtp();
  const otpHash = await hash(otp, 10);
  const now = Date.now();
  const expiresAt = now + OTP_TTL_MS;

  challengeStore.set(studentId, {
    studentId,
    otpHash,
    expiresAt,
    failedAttempts: 0,
    createdAt: now,
  });

  return {
    otp,
    expiresAt: new Date(expiresAt),
  };
}

/**
 * Xác thực OTP của sinh viên
 */
export async function verifyForgotPinOtp(
  studentId: string,
  inputOtp: string,
): Promise<{ valid: boolean; reason?: "EXPIRED" | "TOO_MANY_ATTEMPTS" | "INVALID_OTP" | "NOT_FOUND" }> {
  cleanupExpired();
  const record = challengeStore.get(studentId);
  if (!record) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  if (record.expiresAt < Date.now()) {
    challengeStore.delete(studentId);
    return { valid: false, reason: "EXPIRED" };
  }

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    challengeStore.delete(studentId);
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const isMatch = await compare(inputOtp, record.otpHash);
  if (!isMatch) {
    record.failedAttempts += 1;
    if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      challengeStore.delete(studentId);
      return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
    }
    return { valid: false, reason: "INVALID_OTP" };
  }

  // OTP hợp lệ -> xóa challenge sau khi dùng (consumed)
  challengeStore.delete(studentId);
  return { valid: true };
}

/**
 * Hủy bỏ challenge của sinh viên
 */
export function revokeForgotPinChallenge(studentId: string): void {
  challengeStore.delete(studentId);
}
