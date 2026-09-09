import type { EvaluationEmailInput } from "@/server/services/notifications/email/brevo-email-service";

export interface NotificationSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Interface cho Email Notification Adapter.
 * Tuân thủ Dependency Inversion Principle (DIP):
 * NotificationService phụ thuộc vào abstraction này thay vì trực tiếp thư viện bên thứ ba.
 */
export interface EmailNotificationAdapter {
  readonly id: string;
  isConfigured(): boolean;
  sendEvaluationEmail(
    input: EvaluationEmailInput,
  ): Promise<NotificationSendResult>;
}

/**
 * Interface cho kênh thông báo mở rộng (Open/Closed Principle - OCP).
 * Cho phép cắm thêm các Adapter mới (Zalo ZNS, SMS Brandname, Web Push, In-App)
 * mà không phải sửa đổi mã nguồn xử lý cốt lõi.
 */
export interface NotificationChannelAdapter<TPayload = unknown> {
  readonly channel: "email" | "zalo" | "sms" | "push";
  isAvailable(): boolean;
  send(payload: TPayload): Promise<NotificationSendResult>;
}
