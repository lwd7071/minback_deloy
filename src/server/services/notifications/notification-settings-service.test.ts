import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/teacher-auth", () => ({
  requireTeacher: vi.fn(),
}));
vi.mock("@/server/services/notifications/email/brevo-email-service", () => ({
  assertBrevoConfigured: vi.fn(),
  getBrevoPublicConfig: vi.fn(),
  sendTestEmail: vi.fn(),
}));

import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  getBrevoPublicConfig,
  assertBrevoConfigured,
} from "@/server/services/notifications/email/brevo-email-service";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "./notification-settings-service";
import { ApiError } from "@/lib/api/errors";

describe("Notification Settings Service", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNotificationSettings", () => {
    it("returns emailEnabled directly from Teacher DTO and Brevo public config", async () => {
      vi.mocked(requireTeacher).mockResolvedValue({
        supabase: mockSupabase as any,
        teacher: {
          id: "teacher-123",
          displayName: "Teacher Test",
          emailNotificationEnabled: true,
        },
      });

      vi.mocked(getBrevoPublicConfig).mockReturnValue({
        configured: true,
        senderEmail: "test@example.com",
        senderName: "MinBack Sender",
      });

      const result = await getNotificationSettings();

      expect(result).toEqual({
        emailEnabled: true,
        brevoConfigured: true,
        senderEmail: "test@example.com",
        senderName: "MinBack Sender",
      });

      // Verify that supabase.from() is NOT called in read flow
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns emailEnabled = false when teacher has email notifications disabled", async () => {
      vi.mocked(requireTeacher).mockResolvedValue({
        supabase: mockSupabase as any,
        teacher: {
          id: "teacher-123",
          displayName: "Teacher Test",
          emailNotificationEnabled: false,
        },
      });

      vi.mocked(getBrevoPublicConfig).mockReturnValue({
        configured: false,
        senderEmail: null,
        senderName: "MinBack",
      });

      const result = await getNotificationSettings();

      expect(result).toEqual({
        emailEnabled: false,
        brevoConfigured: false,
        senderEmail: null,
        senderName: "MinBack",
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("propagates errors thrown by requireTeacher", async () => {
      vi.mocked(requireTeacher).mockRejectedValue(
        new ApiError(401, "UNAUTHENTICATED", "Chưa đăng nhập"),
      );

      await expect(getNotificationSettings()).rejects.toThrow("Chưa đăng nhập");
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe("updateNotificationSettings", () => {
    it("updates database and returns updated DTO", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { email_notification_enabled: true },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      const customSupabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      vi.mocked(requireTeacher).mockResolvedValue({
        supabase: customSupabase as any,
        teacher: {
          id: "teacher-123",
          displayName: "Teacher Test",
          emailNotificationEnabled: false,
        },
      });

      vi.mocked(getBrevoPublicConfig).mockReturnValue({
        configured: true,
        senderEmail: "test@example.com",
        senderName: "MinBack",
      });

      const result = await updateNotificationSettings(true);

      expect(assertBrevoConfigured).toHaveBeenCalled();
      expect(customSupabase.from).toHaveBeenCalledWith("teachers");
      expect(mockUpdate).toHaveBeenCalledWith({ email_notification_enabled: true });
      expect(mockEq).toHaveBeenCalledWith("id", "teacher-123");
      expect(result.emailEnabled).toBe(true);
    });
  });
});
