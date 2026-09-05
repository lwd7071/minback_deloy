import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/student-repository", () => ({
  findStudentByIdForSession: vi.fn(),
  updateStudentEmail: vi.fn(),
}));
vi.mock("@/server/services/notifications/email/safe-email-delivery", () => ({
  deliverEmailSafely: vi.fn(async (send: () => Promise<unknown>) => { await send(); return true; }),
}));
vi.mock("@/server/services/notifications/email/brevo-email-service", () => ({
  sendForgotPinOtpEmail: vi.fn(async () => undefined),
}));

import { findStudentByIdForSession, updateStudentEmail } from "@/server/repositories/student-repository";
import { requestStudentEmailChange, confirmStudentEmailChange } from "./student-email-service";

describe("student email change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findStudentByIdForSession).mockResolvedValue({
      id: "s1", classSectionId: "c1", mssv: "SV01", fullName: "Nguyen An",
      email: "sv01@student.hcmute.edu.vn", nickname: "SV01", mustChangeNickname: false,
      mustChangePin: false, lockedUntil: null, createdAt: "", updatedAt: "",
    });
  });

  it("updates email only after the OTP is confirmed", async () => {
    await requestStudentEmailChange("s1", "new@example.com");
    expect(updateStudentEmail).not.toHaveBeenCalled();
    const sentOtp = vi.mocked((await import("@/server/services/notifications/email/brevo-email-service")).sendForgotPinOtpEmail).mock.calls[0][2] as string;
    await confirmStudentEmailChange("s1", sentOtp);
    expect(updateStudentEmail).toHaveBeenCalledWith("s1", "new@example.com");
  });
});
