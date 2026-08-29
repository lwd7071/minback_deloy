import { describe, expect, it } from "vitest";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";

describe("ApiError", () => {
  it("keeps the stable code and HTTP status", () => {
    const error = new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Dữ liệu không hợp lệ",
    );

    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});
