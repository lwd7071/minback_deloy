import { errorResponse, successResponse } from "@/lib/api/response";
import { sendNotificationTestEmail } from "@/server/services/notifications/notification-settings-service";
import { assertSameOrigin } from "@/lib/api/origin";

export async function POST(request: Request) {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);
    return successResponse(await sendNotificationTestEmail());
  } catch (error) {
    return errorResponse(error);
  }
}
