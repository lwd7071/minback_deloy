import type { ApiErrorDetail } from "@/types/api";

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
  internal: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
