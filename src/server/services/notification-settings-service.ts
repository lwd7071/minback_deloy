import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import {
  assertBrevoConfigured,
  getBrevoPublicConfig,
  sendTestEmail,
} from "@/server/services/brevo-email-service";

export type NotificationSettingsDto = {
  emailEnabled: boolean;
  brevoConfigured: boolean;
  senderEmail: string | null;
  senderName: string | null;
};

async function requireTeacher() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new ApiError(
      401,
      API_ERROR_CODES.unauthenticated,
      "Vui lòng đăng nhập Teacher/Admin",
    );
  }

  return { supabase, user: data.user };
}

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
  const { supabase, user } = await requireTeacher();
  const { data, error } = await supabase
    .from("teachers")
    .select("email_notification_enabled")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy Teacher");
  }

  return toDto(Boolean(data.email_notification_enabled));
}

export async function updateNotificationSettings(
  emailEnabled: boolean,
): Promise<NotificationSettingsDto> {
  const { supabase, user } = await requireTeacher();
  if (emailEnabled) assertBrevoConfigured();
  const { data, error } = await supabase
    .from("teachers")
    .update({ email_notification_enabled: emailEnabled })
    .eq("id", user.id)
    .select("email_notification_enabled")
    .single();

  if (error || !data) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy Teacher");
  }

  return toDto(Boolean(data.email_notification_enabled));
}

export async function sendNotificationTestEmail(): Promise<{ success: true }> {
  const { user } = await requireTeacher();
  assertBrevoConfigured();

  if (!user.email) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Tài khoản Teacher chưa có email",
    );
  }

  await sendTestEmail(user.email);
  return { success: true };
}
