import { errorResponse, successResponse } from "@/lib/api/response";
import { sendNotificationTestEmail } from "@/server/services/notification-settings-service";

export async function POST() {
  try {
    return successResponse(await sendNotificationTestEmail());
  } catch (error) {
    return errorResponse(error);
  }
}
