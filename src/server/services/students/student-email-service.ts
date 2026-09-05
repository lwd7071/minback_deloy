import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { findStudentByIdForSession, updateStudentEmail } from "@/server/repositories/student-repository";
import { createEmailChangeChallenge, verifyEmailChangeOtp, revokeEmailChangeChallenge } from "@/server/repositories/password-reset-challenge-repository";
import { deliverEmailSafely } from "@/server/services/notifications/email/safe-email-delivery";
import { sendForgotPinOtpEmail } from "@/server/services/notifications/email/brevo-email-service";

const pending = new Map<string, string>();

export async function requestStudentEmailChange(studentId: string, email: string): Promise<void> {
  const student = await findStudentByIdForSession(studentId);
  if (!student) throw new ApiError(401, API_ERROR_CODES.sessionExpired, "Phiên đăng nhập không hợp lệ");
  const otp = await createEmailChangeChallenge(studentId);
  pending.set(studentId, email.trim().toLowerCase());
  void deliverEmailSafely(() => sendForgotPinOtpEmail(email, student.fullName, otp.otp));
}

export async function confirmStudentEmailChange(studentId: string, otp: string): Promise<void> {
  const email = pending.get(studentId);
  if (!email) throw new ApiError(400, API_ERROR_CODES.validation, "Mã OTP không hợp lệ hoặc đã hết hạn");
  const verified = await verifyEmailChangeOtp(studentId, otp);
  if (!verified.valid) throw new ApiError(400, API_ERROR_CODES.validation, "Mã OTP không hợp lệ hoặc đã hết hạn");
  pending.delete(studentId);
  revokeEmailChangeChallenge(studentId);
  await updateStudentEmail(studentId, email);
}
