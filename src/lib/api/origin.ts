import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { getServerEnv } from "@/lib/env/server";

/**
 * Validates that the request Origin header matches the configured APP_URL origin.
 * Throws 403 FORBIDDEN if Origin is missing or does not match.
 */
export function assertSameOrigin(request: Request): void {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    throw new ApiError(403, API_ERROR_CODES.forbidden, "Origin không hợp lệ");
  }

  const env = getServerEnv();
  const allowedOrigin = new URL(env.APP_URL).origin.toLowerCase();
  const requestOrigin = originHeader.toLowerCase();

  if (requestOrigin !== allowedOrigin) {
    throw new ApiError(403, API_ERROR_CODES.forbidden, "Origin không hợp lệ");
  }
}
