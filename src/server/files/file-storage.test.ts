import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  destroyCloudinaryAsset,
  getFileStorage,
  resetFileStorageAdapter,
  setFileStorageAdapter,
} from "./cloudinary-service";
import type {
  FileStoragePort,
  SignedUploadResult,
  UploadFileVerificationPayload,
  VerifyUploadExpected,
  DownloadUrlOptions,
} from "./contracts/file-storage-port";

describe("File Storage Port & Adapter (OCP / DIP)", () => {
  afterEach(() => {
    resetFileStorageAdapter();
  });

  it("defaults to CloudinaryStorageAdapter", () => {
    const storage = getFileStorage();
    expect(storage.providerId).toBe("cloudinary");
  });

  it("allows plugging in a custom storage adapter (Dependency Inversion)", async () => {
    const destroyMock = vi.fn().mockResolvedValue(undefined);
    const downloadMock = vi
      .fn()
      .mockReturnValue("https://custom-s3.example.com/download/file.pdf");

    const customStorageAdapter: FileStoragePort = {
      providerId: "mock-s3-adapter",
      createSignedUpload: () =>
        ({
          apiKey: "custom-key",
          cloudName: "custom-s3",
          timestamp: 12345,
          signature: "custom-sig",
          publicId: "custom-id",
          uploadPreset: "preset",
          uploadUrl: "https://custom-s3.example.com/upload",
          type: "authenticated",
        }) as SignedUploadResult,
      verifyUpload: () => true,
      destroyAsset: destroyMock,
      createDownloadUrl: downloadMock,
    };

    setFileStorageAdapter(customStorageAdapter);

    expect(getFileStorage().providerId).toBe("mock-s3-adapter");

    await destroyCloudinaryAsset("file-123.pdf");
    expect(destroyMock).toHaveBeenCalledWith("file-123.pdf");

    const downloadUrl = getFileStorage().createDownloadUrl({
      publicId: "file-123.pdf",
      format: "pdf",
    });
    expect(downloadUrl).toBe(
      "https://custom-s3.example.com/download/file.pdf",
    );
  });
});
