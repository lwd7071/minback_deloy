import { describe, expect, it } from "vitest";

import {
  shouldAttemptEvaluationEmail,
  shouldSendEvaluationEmail,
} from "@/server/services/notifications/email-notification-policy";

describe("shouldSendEvaluationEmail", () => {
  it.each(["pending", "graded"] as const)(
    "does not send for %s",
    (currentStatus) => {
      expect(
        shouldSendEvaluationEmail({
          type: "evaluation_updated",
          currentStatus,
          latestOldStatus: "pending",
        }),
      ).toBe(false);
    },
  );

  it("sends when a new evaluation is created as returned", () => {
    expect(
      shouldSendEvaluationEmail({
        type: "evaluation_created",
        currentStatus: "returned",
        latestOldStatus: null,
      }),
    ).toBe(true);
  });

  it("sends once on the first transition to returned", () => {
    expect(
      shouldSendEvaluationEmail({
        type: "evaluation_updated",
        currentStatus: "returned",
        latestOldStatus: "graded",
      }),
    ).toBe(true);
  });

  it("does not resend when an already returned evaluation is edited", () => {
    expect(
      shouldSendEvaluationEmail({
        type: "evaluation_updated",
        currentStatus: "returned",
        latestOldStatus: "returned",
      }),
    ).toBe(false);
  });

  it.each([
    {
      emailEnabled: false,
      studentEmail: "student@example.com",
      brevoConfigured: true,
    },
    { emailEnabled: true, studentEmail: null, brevoConfigured: true },
    {
      emailEnabled: true,
      studentEmail: "student@example.com",
      brevoConfigured: false,
    },
  ])(
    "keeps web-only delivery when an email prerequisite is absent",
    (prerequisites) => {
      expect(
        shouldAttemptEvaluationEmail({
          type: "evaluation_created",
          currentStatus: "returned",
          latestOldStatus: null,
          ...prerequisites,
        }),
      ).toBe(false);
    },
  );
});
