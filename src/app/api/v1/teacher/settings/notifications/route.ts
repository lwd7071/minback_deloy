import { z } from "zod";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { errorResponse, successResponse } from "@/lib/api/response";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/server/services/notifications/notification-settings-service";
import { assertSameOrigin } from "@/lib/api/origin";

const updateSettingsSchema = z.object({
  emailEnabled: z.boolean(),
});

export async function GET() {
  try {
    return successResponse(await getNotificationSettings());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu cấu hình không hợp lệ",
      );
    }

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu cấu hình không hợp lệ",
      );
    }

    return successResponse(
      await updateNotificationSettings(parsed.data.emailEnabled),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
