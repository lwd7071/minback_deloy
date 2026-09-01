import { describe, expect, it } from "vitest";

import { getCloudinaryUploadErrorMessage } from "@/lib/cloudinary-upload-error";

describe("getCloudinaryUploadErrorMessage", () => {
  it("hides Cloudinary permission details from the user", () => {
    const rawMessage =
      '[prodenv:test] Request forbidden due to missing permissions (actions=["create"])';

    const message = getCloudinaryUploadErrorMessage({
      error: { message: rawMessage },
    });

    expect(message).toBe(
      "Hệ thống lưu trữ chưa được cấp quyền tải file. Vui lòng liên hệ quản trị viên.",
    );
    expect(message).not.toContain("prodenv");
    expect(message).not.toContain("actions");
  });

  it("maps invalid credentials to a configuration error", () => {
    expect(
      getCloudinaryUploadErrorMessage({
        error: { message: "Invalid Signature abc123" },
      }),
    ).toBe(
      "Cấu hình dịch vụ lưu trữ chưa hợp lệ. Vui lòng liên hệ quản trị viên.",
    );
  });

  it("uses a generic message for unknown response bodies", () => {
    expect(getCloudinaryUploadErrorMessage(null)).toBe(
      "Không thể tải file lên. Vui lòng thử lại sau.",
    );
  });
});
