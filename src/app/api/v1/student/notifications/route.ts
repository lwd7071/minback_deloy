/**
 * GET /api/v1/student/notifications
 * Lấy danh sách Notification của Student hiện tại.
 *
 * Query params: page, pageSize, unreadOnly
 *
 * Response:
 * - 200: { data: NotificationDto[], meta: { page, pageSize, total, unreadCount } }
 * - 401: UNAUTHENTICATED | SESSION_EXPIRED | CREDENTIAL_CHANGE_REQUIRED
 */

import { type NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse } from "@/lib/api/response";
import { notificationListQuerySchema } from "@/schemas/student-auth";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { listNotificationsByStudentId } from "@/server/repositories/notification-repository";
import { ApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Chỉ Student với 'full' session mới xem được notification
    const { studentId } = await requireFullStudentSession();

    const { searchParams } = new URL(request.url);
    const queryRaw = {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") ?? undefined,
    };

    const parsed = notificationListQuerySchema.safeParse(queryRaw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return errorResponse(
        new ApiError(400, "VALIDATION_ERROR", "Query params không hợp lệ", details),
      );
    }

    const result = await listNotificationsByStudentId(studentId, parsed.data);

    return successResponse(result.notifications, undefined, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: result.total,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
