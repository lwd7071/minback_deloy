import type { ApiErrorDetail } from "@/types/api";

// do cài đặt trình quản trị tự dộng quy định
// chuẩn hóa backend và frontend khi nhận mã 401 ko bt user sai mk pin hay token hết hay bị đổi mk mới
// có cái này sẽ trả về json chuản trỉnh hơn
export const API_ERROR_CODES = {
  validation: "VALIDATION_ERROR",
  invalidStateTransition: "INVALID_STATE_TRANSITION",
  invalidCredentials: "INVALID_CREDENTIALS",
  unauthenticated: "UNAUTHENTICATED",
  sessionExpired: "SESSION_EXPIRED",
  credentialChangeRequired: "CREDENTIAL_CHANGE_REQUIRED",
  forbidden: "FORBIDDEN",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  loginRateLimited: "LOGIN_RATE_LIMITED",
  emailNotConfigured: "EMAIL_NOT_CONFIGURED",
  emailDeliveryFailed: "EMAIL_DELIVERY_FAILED",
  internal: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// apierror này đc backend khởi tạo và xy ly sau do thanh json và trả về cho frontend
export class ApiError extends Error {
  constructor(
    public readonly status: number, // mã trạng thái http tương ứng
    public readonly code: ApiErrorCode, // hẹ thống chuản mã lội phải thuộc danh sách
    message: string, // thông báo rút gọn văn bản
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
