import "server-only";

import { compare, hash } from "bcrypt";
import { randomInt } from "crypto";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { findStudentByIdForSession, updateStudentEmail } from "@/server/repositories/student-repository";
import { deliverEmailSafely } from "@/server/services/notifications/email/safe-email-delivery";
import { sendForgotPinOtpEmail } from "@/server/services/notifications/email/brevo-email-service";

const pending = new Map<string, { email: string; otpHash: string; expiresAt: number; attempts: number }>();

export async function requestStudentEmailChange(studentId: string, email: string): Promise<void> {
  const student = await findStudentByIdForSession(studentId);
  if (!student) throw new ApiError(401, API_ERROR_CODES.sessionExpired, "Phiên đăng nhập không hợp lệ");
  const otp = String(randomInt(100000, 1000000));
  pending.set(studentId, { email: email.trim().toLowerCase(), otpHash: await hash(otp, 10), expiresAt: Date.now() + 10 * 60_000, attempts: 0 });
  void deliverEmailSafely(() => sendForgotPinOtpEmail(email, student.fullName, otp));
}

export async function confirmStudentEmailChange(studentId: string, otp: string): Promise<void> {
  const challenge = pending.get(studentId);
  if (!challenge || challenge.expiresAt < Date.now() || challenge.attempts >= 5) throw new ApiError(400, API_ERROR_CODES.validation, "Mã OTP không hợp lệ hoặc đã hết hạn");
  if (!(await compare(otp, challenge.otpHash))) { challenge.attempts += 1; throw new ApiError(400, API_ERROR_CODES.validation, "Mã OTP không chính xác"); }
  pending.delete(studentId);
  await updateStudentEmail(studentId, challenge.email);
}
