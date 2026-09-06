import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  assertBrevoConfigured,
  getBrevoPublicConfig,
  sendTestEmail,
} from "@/server/services/notifications/email/brevo-email-service";

export type NotificationSettingsDto = {
  emailEnabled: boolean;
  brevoConfigured: boolean;
  senderEmail: string | null;
  senderName: string | null;
};

function toDto(emailEnabled: boolean): NotificationSettingsDto {
  const brevo = getBrevoPublicConfig();
  return {
    emailEnabled,
    brevoConfigured: brevo.configured,
    senderEmail: brevo.senderEmail,
    senderName: brevo.senderName,
  };
}

export async function getNotificationSettings(): Promise<NotificationSettingsDto> {
  const { teacher } = await requireTeacher();
  return toDto(teacher.emailNotificationEnabled);
}

export async function updateNotificationSettings(
  emailEnabled: boolean,
): Promise<NotificationSettingsDto> {
  const { supabase, teacher } = await requireTeacher();
  if (emailEnabled) assertBrevoConfigured();
  const { data, error } = await supabase
    .from("teachers")
    .update({ email_notification_enabled: emailEnabled })
    .eq("id", teacher.id)
    .select("email_notification_enabled")
    .single();

  if (error || !data) {
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể cập nhật cài đặt thông báo",
    );
  }

  return toDto(Boolean(data.email_notification_enabled));
}

export async function sendNotificationTestEmail(): Promise<{ success: true }> {
  const { supabase } = await requireTeacher();

  // Get email from auth user via the already-authenticated supabase client
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Tài khoản Teacher chưa có email",
    );
  }

  assertBrevoConfigured();
  await sendTestEmail(user.email);
  return { success: true };
}
