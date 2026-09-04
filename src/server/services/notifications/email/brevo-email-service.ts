import "server-only";

import { z } from "zod";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  escapeHtml,
  renderEvaluationReturnedEmail,
} from "./templates/evaluation-returned-template";
import { renderTestEmail } from "./templates/test-email-template";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BREVO_TIMEOUT_MS = 10_000;

export const brevoConfigSchema = z.object({
  apiKey: z.string().trim().min(1, "Thiếu BREVO_API_KEY"),
  senderEmail: z.string().email("BREVO_SENDER_EMAIL không hợp lệ"),
  senderName: z.string().trim().min(1).max(100),
  appUrl: z.string().url("APP_URL không hợp lệ"),
});

export const brevoSuccessSchema = z.object({ messageId: z.string().min(1) });

export type BrevoPublicConfig = {
  configured: boolean;
  senderEmail: string | null;
  senderName: string | null;
};

export type EvaluationEmailInput = {
  recipientEmail: string;
  studentFullName: string;
  assignmentTitle: string;
  classCode: string;
  className: string;
};

type FetchLike = typeof fetch;

function readBrevoConfig() {
  const parsed = brevoConfigSchema.safeParse({
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL,
    senderName: process.env.BREVO_SENDER_NAME ?? "MinBack",
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
  });

  if (!parsed.success) {
    throw new ApiError(
      400,
      API_ERROR_CODES.emailNotConfigured,
      "Brevo chưa được cấu hình đầy đủ",
    );
  }

  return parsed.data;
}

export function getBrevoPublicConfig(): BrevoPublicConfig {
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || null;
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "MinBack";
  const configured = brevoConfigSchema.safeParse({
    apiKey: process.env.BREVO_API_KEY,
    senderEmail,
    senderName,
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
  }).success;

  return {
    configured,
    senderEmail,
    senderName: senderEmail ? senderName : null,
  };
}

export function assertBrevoConfigured(): void {
  readBrevoConfig();
}

// Re-export escapeHtml for backward compatibility with existing callers/tests
export { escapeHtml };

/**
 * Xây dựng nội dung email thông báo kết quả bài tập.
 * Đảm bảo backward compatibility và tách biệt template.
 */
export function buildEvaluationEmail(
  input: Omit<EvaluationEmailInput, "recipientEmail">,
  appUrl: string,
) {
  return renderEvaluationReturnedEmail(input, appUrl);
}

/**
 * Gửi email thông báo kết quả bài tập tới sinh viên qua Brevo API.
 */
export async function sendEvaluationEmail(
  input: EvaluationEmailInput,
  fetchImpl: FetchLike = fetch,
): Promise<{ messageId: string }> {
  const config = readBrevoConfig();
  const content = buildEvaluationEmail(input, config.appUrl);

  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: input.recipientEmail }],
        subject: content.subject,
        htmlContent: content.htmlContent,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });

    if (response.status !== 201) {
      throw new Error(`BREVO_HTTP_${response.status}`);
    }

    const result = brevoSuccessSchema.safeParse(await response.json());
    if (!result.success) {
      throw new Error("BREVO_INVALID_RESPONSE");
    }

    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      API_ERROR_CODES.emailDeliveryFailed,
      "Không thể gửi email qua Brevo",
    );
  }
}

/**
 * Gửi email kiểm tra cấu hình Brevo tới email của Teacher đang đăng nhập.
 */
export async function sendTestEmail(
  recipientEmail: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ messageId: string }> {
  const config = readBrevoConfig();
  const content = renderTestEmail();

  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: recipientEmail }],
        subject: content.subject,
        htmlContent: content.htmlContent,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });

    if (response.status !== 201) {
      throw new Error(`BREVO_HTTP_${response.status}`);
    }

    const result = brevoSuccessSchema.safeParse(await response.json());
    if (!result.success) throw new Error("BREVO_INVALID_RESPONSE");
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      API_ERROR_CODES.emailDeliveryFailed,
      "Không thể gửi email qua Brevo",
    );
  }
}

/**
 * Gửi email OTP khôi phục mã PIN tới sinh viên.
 */
export async function sendForgotPinOtpEmail(
  recipientEmail: string,
  studentName: string,
  otp: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ messageId: string }> {
  const config = readBrevoConfig();
  const subject = `[MinBack] Mã OTP đặt lại mã PIN của bạn: ${otp}`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #16303d;">
      <h2 style="color: #1e3a4a; margin-top: 0;">Yêu cầu đặt lại mã PIN</h2>
      <p>Xin chào <strong>${escapeHtml(studentName)}</strong>,</p>
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mã PIN đăng nhập vào hệ thống MinBack.</p>
      <div style="background: #fff3cc; border: 1px solid #f5b400; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <span style="font-size: 14px; color: #8a5a00; display: block; margin-bottom: 6px;">Mã OTP của bạn (có hiệu lực trong 10 phút):</span>
        <strong style="font-size: 32px; letter-spacing: 6px; font-family: monospace; color: #1e3a4a;">${otp}</strong>
      </div>
      <p style="font-size: 13px; color: #7b898f;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
    </div>
  `;

  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: recipientEmail }],
        subject,
        htmlContent,
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });

    if (response.status !== 201) {
      throw new Error(`BREVO_HTTP_${response.status}`);
    }

    const result = brevoSuccessSchema.safeParse(await response.json());
    if (!result.success) throw new Error("BREVO_INVALID_RESPONSE");
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      API_ERROR_CODES.emailDeliveryFailed,
      "Không thể gửi email qua Brevo",
    );
  }
}
