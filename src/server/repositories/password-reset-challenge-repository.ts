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
type ChallengePurpose = "forgot_pin" | "change_email";

// Map lưu trữ OTP challenge trong bộ nhớ có TTL và giới hạn thử sai
const challengeStore = new Map<string, ChallengeRecord>();
const challengeKey = (studentId: string, purpose: ChallengePurpose) => `${purpose}:${studentId}`;

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
export async function createChallenge(studentId: string, purpose: ChallengePurpose): Promise<{ otp: string; expiresAt: Date }> {
  cleanupExpired();
  const otp = generateOtp();
  const otpHash = await hash(otp, 10);
  const now = Date.now();
  const expiresAt = now + OTP_TTL_MS;

  challengeStore.set(challengeKey(studentId, purpose), {
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

export const createForgotPinChallenge = (studentId: string) => createChallenge(studentId, "forgot_pin");
export const createEmailChangeChallenge = (studentId: string) => createChallenge(studentId, "change_email");

/**
 * Xác thực OTP của sinh viên
 */
export async function verifyChallenge(
  studentId: string,
  inputOtp: string,
  purpose: ChallengePurpose,
): Promise<{ valid: boolean; reason?: "EXPIRED" | "TOO_MANY_ATTEMPTS" | "INVALID_OTP" | "NOT_FOUND" }> {
  cleanupExpired();
  const key = challengeKey(studentId, purpose);
  const record = challengeStore.get(key);
  if (!record) {
    return { valid: false, reason: "NOT_FOUND" };
  }

  if (record.expiresAt < Date.now()) {
    challengeStore.delete(key);
    return { valid: false, reason: "EXPIRED" };
  }

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    challengeStore.delete(key);
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const isMatch = await compare(inputOtp, record.otpHash);
  if (!isMatch) {
    record.failedAttempts += 1;
    if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      challengeStore.delete(key);
      return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
    }
    return { valid: false, reason: "INVALID_OTP" };
  }

  // OTP hợp lệ -> xóa challenge sau khi dùng (consumed)
  challengeStore.delete(key);
  return { valid: true };
}

export const verifyForgotPinOtp = (studentId: string, inputOtp: string) => verifyChallenge(studentId, inputOtp, "forgot_pin");
export const verifyEmailChangeOtp = (studentId: string, inputOtp: string) => verifyChallenge(studentId, inputOtp, "change_email");

/**
 * Hủy bỏ challenge của sinh viên
 */
export function revokeForgotPinChallenge(studentId: string): void {
  challengeStore.delete(challengeKey(studentId, "forgot_pin"));
}

export function revokeEmailChangeChallenge(studentId: string): void {
  challengeStore.delete(challengeKey(studentId, "change_email"));
}
