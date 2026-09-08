import "server-only";

import type {
  EmailNotificationAdapter,
  NotificationSendResult,
} from "@/server/services/notifications/contracts/notification-adapter";
import {
  getBrevoPublicConfig,
  sendEvaluationEmail,
  type EvaluationEmailInput,
} from "@/server/services/notifications/email/brevo-email-service";

/**
 * Brevo Implementation của EmailNotificationAdapter.
 * Đóng gói toàn bộ logic giao tiếp cụ thể với Brevo SMTP/REST API.
 */
export class BrevoEmailAdapter implements EmailNotificationAdapter {
  readonly id = "brevo";

  isConfigured(): boolean {
    return getBrevoPublicConfig().configured;
  }

  async sendEvaluationEmail(
    input: EvaluationEmailInput,
  ): Promise<NotificationSendResult> {
    const result = await sendEvaluationEmail(input);
    return {
      success: true,
      messageId: result.messageId,
    };
  }
}

/**
 * Adapter mặc định dùng Brevo.
 */
export const defaultEmailAdapter: EmailNotificationAdapter =
  new BrevoEmailAdapter();
