import { describe, expect, it } from "vitest";

import { API_ERROR_CODES, ApiError, RepositoryError } from "@/lib/api/errors";

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

describe("RepositoryError", () => {
  it("encapsulates internal error code and preserves cause", () => {
    const cause = new Error("connection timeout");
    const error = new RepositoryError("STUDENT_LIST_FAILED", "Lỗi CSDL", {
      cause,
    });

    expect(error.name).toBe("RepositoryError");
    expect(error.code).toBe("STUDENT_LIST_FAILED");
    expect(error.message).toBe("Lỗi CSDL");
    expect(error.cause).toBe(cause);
  });
});
