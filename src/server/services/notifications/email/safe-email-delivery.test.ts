import { describe, expect, it, vi } from "vitest";

import { deliverEmailSafely } from "@/server/services/notifications/email/safe-email-delivery";

describe("deliverEmailSafely", () => {
  it("does not propagate a Brevo failure to the committed evaluation flow", async () => {
    const logFailure = vi.fn();
    const delivered = await deliverEmailSafely(
      () => Promise.reject(new Error("secret recipient@example.com html-body")),
      logFailure,
    );

    expect(delivered).toBe(false);
    expect(logFailure).toHaveBeenCalledExactlyOnceWith("EMAIL_DELIVERY_FAILED");
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(logFailure.mock.calls)).not.toContain(
      "recipient@example.com",
    );
  });
});
