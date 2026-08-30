/**
 * PATCH /api/v1/student/notifications/[notificationId]/read
 *
 * Đánh dấu một Notification là đã đọc.
 * Student chỉ được mark-read notification của chính mình (scope bởi studentId từ session).
 *
 * Response:
 * - 200: { data: NotificationDto }
 * - 401: UNAUTHENTICATED | SESSION_EXPIRED | CREDENTIAL_CHANGE_REQUIRED
 * - 404: NOT_FOUND
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { markNotificationAsRead } from "@/server/repositories/notification-repository";
import { assertSameOrigin } from "@/lib/api/origin";

type RouteParams = { params: Promise<{ notificationId: string }> };

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    // CSRF check: phải là bước đầu tiên theo engineering-rules §5.4 và §6.3
    assertSameOrigin(request);

    const { studentId } = await requireFullStudentSession();
    const { notificationId } = await params;

    const notification = await markNotificationAsRead(notificationId, studentId);

    if (!notification) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy thông báo",
      );
    }

    return successResponse(notification);
  } catch (error) {
    return errorResponse(error);
  }
}
