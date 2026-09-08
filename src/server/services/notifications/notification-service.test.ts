import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { EmailNotificationAdapter } from "@/server/services/notifications/contracts/notification-adapter";
import { createEvaluationNotification } from "@/server/services/notifications/notification-service";

// Mock supabase server client
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === "evaluations") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    };
  }
  if (table === "notifications") {
    return {
      insert: mockInsert,
    };
  }
  if (table === "teachers") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    };
  }
  if (table === "evaluation_history") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };
  }
  return {};
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

describe("notification-service with Adapter Pattern (OCP/DIP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("không gửi thông báo nếu evaluation ở trạng thái pending", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        status: "pending",
        students: { email: "student@example.com", full_name: "Nguyen Van A" },
        assignments: {
          title: "Bai Tap 1",
          class_sections: { code: "CS101", name: "Lap Trinh", teacher_id: "teacher-1" },
        },
      },
      error: null,
    });

    const result = await createEvaluationNotification({
      studentId: "student-1",
      evaluationId: "eval-1",
      type: "evaluation_created",
      assignmentTitle: "Bai Tap 1",
    });

    expect(result.emailSent).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("gửi qua custom adapter được inject (Dependency Inversion)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        status: "returned",
        students: { email: "student@example.com", full_name: "Nguyen Van A" },
        assignments: {
          title: "Bai Tap 1",
          class_sections: { code: "CS101", name: "Lap Trinh", teacher_id: "teacher-1" },
        },
      },
      error: null,
    });
    mockInsert.mockResolvedValueOnce({ error: null });
    mockMaybeSingle.mockResolvedValueOnce({
      data: { email_notification_enabled: true },
      error: null,
    });

    // Tạo một Mock Adapter bất kỳ (không phụ thuộc vào Brevo)
    const mockAdapter: EmailNotificationAdapter = {
      id: "mock-custom-provider",
      isConfigured: vi.fn().mockReturnValue(true),
      sendEvaluationEmail: vi.fn().mockResolvedValue({
        success: true,
        messageId: "mock-msg-12345",
      }),
    };

    const result = await createEvaluationNotification(
      {
        studentId: "student-1",
        evaluationId: "eval-1",
        type: "evaluation_created",
        assignmentTitle: "Bai Tap 1",
      },
      { emailAdapter: mockAdapter },
    );

    // Kiểm chứng in-app notification đã được tạo
    expect(mockInsert).toHaveBeenCalledWith({
      student_id: "student-1",
      evaluation_id: "eval-1",
      type: "evaluation_created",
      message: 'Kết quả bài tập "Bai Tap 1" đã được cập nhật.',
    });

    // Kiểm chứng Adapter được gọi chính xác
    expect(mockAdapter.isConfigured).toHaveBeenCalled();
    expect(mockAdapter.sendEvaluationEmail).toHaveBeenCalledWith({
      recipientEmail: "student@example.com",
      studentFullName: "Nguyen Van A",
      assignmentTitle: "Bai Tap 1",
      classCode: "CS101",
      className: "Lap Trinh",
    });

    expect(result.emailSent).toBe(true);
  });

  it("xử lý an toàn khi adapter gửi email thất bại (graceful degradation)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        status: "returned",
        students: { email: "student@example.com", full_name: "Nguyen Van A" },
        assignments: {
          title: "Bai Tap 1",
          class_sections: { code: "CS101", name: "Lap Trinh", teacher_id: "teacher-1" },
        },
      },
      error: null,
    });
    mockInsert.mockResolvedValueOnce({ error: null });
    mockMaybeSingle.mockResolvedValueOnce({
      data: { email_notification_enabled: true },
      error: null,
    });

    const failingAdapter: EmailNotificationAdapter = {
      id: "failing-provider",
      isConfigured: vi.fn().mockReturnValue(true),
      sendEvaluationEmail: vi.fn().mockRejectedValue(new Error("Network timeout")),
    };

    const result = await createEvaluationNotification(
      {
        studentId: "student-1",
        evaluationId: "eval-1",
        type: "evaluation_created",
        assignmentTitle: "Bai Tap 1",
      },
      { emailAdapter: failingAdapter },
    );

    expect(result.emailSent).toBe(false);
  });
});
