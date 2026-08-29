import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  assertBrevoConfigured,
  buildEvaluationEmail,
  sendEvaluationEmail,
} from "@/server/services/brevo-email-service";

const originalEnv = { ...process.env };

describe("brevo-email-service", () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_SENDER_EMAIL = "verified@example.com";
    process.env.BREVO_SENDER_NAME = "MinBack";
    process.env.APP_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects enabling email when configuration is missing", () => {
    delete process.env.BREVO_API_KEY;

    expect(() => assertBrevoConfigured()).toThrowError(
      expect.objectContaining({
        code: API_ERROR_CODES.emailNotConfigured,
        status: 400,
      }),
    );
  });

  it("escapes dynamic HTML and never includes score or feedback", () => {
    const email = buildEvaluationEmail(
      {
        studentFullName: '<img src=x onerror="bad">',
        assignmentTitle: "Bài <script>bad()</script>",
        classCode: "SE-01",
        className: "Lớp & Một",
      },
      "http://localhost:3000",
    );

    expect(email.htmlContent).toContain("&lt;img");
    expect(email.htmlContent).toContain("&lt;script&gt;");
    expect(email.htmlContent).toContain("Lớp &amp; Một");
    expect(email.htmlContent).not.toContain('onerror="bad"');
    expect(email.htmlContent).not.toContain("score");
  });

  it("accepts only HTTP 201 with a messageId", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "message-1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      sendEvaluationEmail(
        {
          recipientEmail: "student@example.com",
          studentFullName: "Sinh viên",
          assignmentTitle: "Bài 1",
          classCode: "SE-01",
          className: "Software Engineering",
        },
        fetchMock,
      ),
    ).resolves.toEqual({ messageId: "message-1" });
  });

  it.each([
    new Response(JSON.stringify({ messageId: "ignored" }), { status: 200 }),
    new Response(JSON.stringify({}), { status: 201 }),
  ])(
    "returns a safe delivery error for a rejected response",
    async (response) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);

      try {
        await sendEvaluationEmail(
          {
            recipientEmail: "student@example.com",
            studentFullName: "Sinh viên",
            assignmentTitle: "Bài 1",
            classCode: "SE-01",
            className: "Software Engineering",
          },
          fetchMock,
        );
        throw new Error("Expected sendEvaluationEmail to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
          code: API_ERROR_CODES.emailDeliveryFailed,
          status: 502,
          message: "Không thể gửi email qua Brevo",
        });
        expect(JSON.stringify(error)).not.toContain("test-api-key");
        expect(JSON.stringify(error)).not.toContain("student@example.com");
      }
    },
  );
});
