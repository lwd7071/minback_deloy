import "server-only";

import { z } from "zod";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const BREVO_TIMEOUT_MS = 10_000;

const brevoConfigSchema = z.object({
  apiKey: z.string().trim().min(1),
  senderEmail: z.email(),
  senderName: z.string().trim().min(1).max(100),
  appUrl: z.url(),
});

const brevoSuccessSchema = z.object({ messageId: z.string().min(1) });

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

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export function buildEvaluationEmail(
  input: Omit<EvaluationEmailInput, "recipientEmail">,
  appUrl: string,
) {
  const studentFullName = escapeHtml(input.studentFullName);
  const assignmentTitle = escapeHtml(input.assignmentTitle);
  const classCode = escapeHtml(input.classCode);
  const className = escapeHtml(input.className);
  const loginUrl = `${appUrl.replace(/\/$/, "")}/student/login`;

  return {
    subject: `[MinBack] Có kết quả mới - ${input.classCode}`,
    htmlContent: [
      `<p>Xin chào ${studentFullName},</p>`,
      `<p>Giáo viên đã công bố kết quả bài tập “${assignmentTitle}” thuộc lớp học phần ${classCode} — ${className}.</p>`,
      `<p>Vui lòng đăng nhập MinBack để xem điểm và feedback:<br><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>`,
      "<p>Đây là email tự động, vui lòng không trả lời.</p>",
    ].join(""),
  };
}

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

export async function sendTestEmail(
  recipientEmail: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ messageId: string }> {
  const config = readBrevoConfig();

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
        subject: "[MinBack] Kiểm tra cấu hình email",
        htmlContent:
          "<p>Cấu hình Brevo của MinBack đang hoạt động.</p><p>Đây là email tự động, vui lòng không trả lời.</p>",
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
