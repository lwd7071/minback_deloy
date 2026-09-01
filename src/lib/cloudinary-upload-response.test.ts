import { describe, expect, it } from "vitest";

import { normalizeCloudinaryRawUpload } from "@/lib/cloudinary-upload-response";

const rawUploadResponse = {
  asset_id: "asset-1",
  public_id: "minback/submissions/file.pdf",
  version: 123,
  signature: "response-signature",
  secure_url: "https://res.cloudinary.com/demo/raw/authenticated/file.pdf",
  resource_type: "raw",
  bytes: 2048,
};

describe("normalizeCloudinaryRawUpload", () => {
  it("derives the format from the approved original name for raw responses", () => {
    expect(
      normalizeCloudinaryRawUpload(rawUploadResponse, "BaiTapTuan2-BS.pdf"),
    ).toMatchObject({
      originalName: "BaiTapTuan2-BS.pdf",
      format: "pdf",
      resourceType: "raw",
    });
  });

  it("prefers the format returned by Cloudinary", () => {
    expect(
      normalizeCloudinaryRawUpload(
        { ...rawUploadResponse, format: "PDF" },
        "BaiTapTuan2-BS.pdf",
      ).format,
    ).toBe("pdf");
  });

  it("rejects an incomplete Cloudinary response", () => {
    expect(() =>
      normalizeCloudinaryRawUpload({ resource_type: "raw" }, "file.pdf"),
    ).toThrow("Phản hồi từ hệ thống lưu trữ không hợp lệ");
  });
});
