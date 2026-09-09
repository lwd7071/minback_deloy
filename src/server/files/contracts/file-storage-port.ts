import type { AllowedFileFormat } from "@/server/files/file-policy";

export type UploadTarget = "assignment-attachment" | "submission";

export interface SignedUploadResult {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadPreset: string;
  uploadUrl: string;
  type: "authenticated";
  [key: string]: unknown;
}

export interface UploadFileVerificationPayload {
  assetId?: string;
  publicId: string;
  version: number;
  signature: string;
  secureUrl?: string;
  resourceType: "raw" | string;
  format: string;
  bytes?: number;
}

export interface VerifyUploadExpected {
  target: UploadTarget;
  assignmentId: string;
  format: AllowedFileFormat;
}

export interface DownloadUrlOptions {
  publicId: string;
  format: string;
  expiresInSeconds?: number;
}

/**
 * FileStoragePort
 * Hợp đồng cổng lưu trữ tệp tin theo nguyên lý DIP & OCP.
 * Cho phép dịch vụ nghiệp vụ (submission, assignment) giao tiếp với hạ tầng lưu trữ
 * (Cloudinary, AWS S3, Cloudflare R2) thông qua abstraction mà không bị phụ thuộc cứng.
 */
export interface FileStoragePort {
  readonly providerId: string;
  createSignedUpload(
    target: UploadTarget,
    assignmentId: string,
    format: AllowedFileFormat,
  ): SignedUploadResult;
  verifyUpload(
    response: UploadFileVerificationPayload,
    expected: VerifyUploadExpected,
  ): boolean;
  destroyAsset(publicId: string): Promise<void>;
  createDownloadUrl(input: DownloadUrlOptions): string;
}
