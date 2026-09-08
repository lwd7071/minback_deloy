import "server-only";

import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

import { getServerEnv } from "@/lib/env/server";
import { verifyCloudinaryResponseSignature } from "@/server/files/cloudinary-response-signature";
import type { AllowedFileFormat } from "@/server/files/file-policy";
import type {
  DownloadUrlOptions,
  FileStoragePort,
  SignedUploadResult,
  UploadFileVerificationPayload,
  UploadTarget,
  VerifyUploadExpected,
} from "@/server/files/contracts/file-storage-port";

export type { UploadTarget };

export type CloudinaryUploadSignature = SignedUploadResult;

const UPLOAD_PRESET = "minback_authenticated_files";

export type CloudinaryUploadResponse = UploadFileVerificationPayload & {
  assetId: string;
  secureUrl: string;
  resourceType: "raw";
  bytes: number;
};

function configuredCloudinary() {
  const env = getServerEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
    signature_algorithm: "sha256",
  });
  return { cloudinary, env };
}

function folderFor(target: UploadTarget, assignmentId: string): string {
  const environment =
    process.env.NODE_ENV === "production" ? "production" : "development";
  return `minback/${environment}/${target === "submission" ? "submissions" : "assignment-attachments"}/${assignmentId}`;
}

/**
 * CloudinaryStorageAdapter
 * Hiện thực hóa FileStoragePort cho Cloudinary (Adapter Pattern - OCP / DIP).
 */
export class CloudinaryStorageAdapter implements FileStoragePort {
  readonly providerId = "cloudinary";

  createSignedUpload(
    target: UploadTarget,
    assignmentId: string,
    format: AllowedFileFormat,
  ): CloudinaryUploadSignature {
    const { cloudinary: client, env } = configuredCloudinary();
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${folderFor(target, assignmentId)}/${randomUUID()}.${format}`;
    const paramsToSign = {
      timestamp,
      public_id: publicId,
      upload_preset: UPLOAD_PRESET,
      type: "authenticated",
      overwrite: false,
    } as const;

    return {
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      timestamp,
      signature: client.utils.api_sign_request(
        paramsToSign,
        env.CLOUDINARY_API_SECRET,
      ),
      publicId,
      uploadPreset: UPLOAD_PRESET,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
      type: "authenticated",
    };
  }

  verifyUpload(
    response: UploadFileVerificationPayload,
    expected: VerifyUploadExpected,
  ): boolean {
    const { env } = configuredCloudinary();
    const expectedPrefix = `${folderFor(expected.target, expected.assignmentId)}/`;
    return (
      response.resourceType === "raw" &&
      response.format === expected.format &&
      response.publicId.startsWith(expectedPrefix) &&
      verifyCloudinaryResponseSignature(
        {
          publicId: response.publicId,
          version: response.version,
          signature: response.signature,
        },
        env.CLOUDINARY_API_SECRET,
      )
    );
  }

  async destroyAsset(publicId: string): Promise<void> {
    const { cloudinary: client } = configuredCloudinary();
    const response = await client.uploader.destroy(publicId, {
      resource_type: "raw",
      type: "authenticated",
      invalidate: true,
    });
    if (response.result !== "ok" && response.result !== "not found") {
      throw new Error("CLOUDINARY_DESTROY_FAILED");
    }
  }

  createDownloadUrl(input: DownloadUrlOptions): string {
    const { cloudinary: client } = configuredCloudinary();
    return client.utils.private_download_url(input.publicId, input.format, {
      resource_type: "raw",
      type: "authenticated",
      expires_at:
        Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 5 * 60),
      attachment: true,
    });
  }
}

export const cloudinaryStorageAdapter = new CloudinaryStorageAdapter();

let currentStorageAdapter: FileStoragePort = cloudinaryStorageAdapter;

/**
 * Lấy adapter lưu trữ hiện tại.
 * Mặc định sử dụng CloudinaryStorageAdapter, có thể ghi đè qua setFileStorageAdapter.
 */
export function getFileStorage(): FileStoragePort {
  return currentStorageAdapter;
}

export function setFileStorageAdapter(adapter: FileStoragePort): void {
  currentStorageAdapter = adapter;
}

export function resetFileStorageAdapter(): void {
  currentStorageAdapter = cloudinaryStorageAdapter;
}

// Giữ các hàm helper tiện ích ủy thác qua getFileStorage() để duy trì 100% tương thích ngược
export function createSignedUpload(
  target: UploadTarget,
  assignmentId: string,
  format: AllowedFileFormat,
): CloudinaryUploadSignature {
  return getFileStorage().createSignedUpload(target, assignmentId, format);
}

export function verifyCloudinaryUpload(
  response: CloudinaryUploadResponse,
  expected: {
    target: UploadTarget;
    assignmentId: string;
    format: AllowedFileFormat;
  },
): boolean {
  return getFileStorage().verifyUpload(response, expected);
}

export async function destroyCloudinaryAsset(publicId: string): Promise<void> {
  return getFileStorage().destroyAsset(publicId);
}

export function createPrivateDownloadUrl(input: {
  publicId: string;
  format: string;
}): string {
  return getFileStorage().createDownloadUrl(input);
}
