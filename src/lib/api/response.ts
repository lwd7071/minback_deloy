import { NextResponse } from "next/server";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import type { ApiFailure, ApiMeta, ApiSuccess } from "@/types/api";

export function successResponse<T>(
  data: T,
  init?: ResponseInit,
  meta?: ApiMeta,
) {
  const body: ApiSuccess<T> = meta ? { data, meta } : { data };
  return NextResponse.json(body, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const body: ApiFailure = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    return NextResponse.json(body, { status: error.status });
  }

  const body: ApiFailure = {
    error: {
      code: API_ERROR_CODES.internal,
      message: "Đã xảy ra lỗi hệ thống",
    },
  };
  return NextResponse.json(body, { status: 500 });
}
