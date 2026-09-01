import "server-only";

import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

import { getServerEnv } from "@/lib/env/server";
import { verifyCloudinaryResponseSignature } from "@/server/files/cloudinary-response-signature";
import type { AllowedFileFormat } from "@/server/files/file-policy";

export type UploadTarget = "assignment-attachment" | "submission";

export type CloudinaryUploadSignature = {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadPreset: string;
  uploadUrl: string;
  type: "authenticated";
};

const UPLOAD_PRESET = "minback_authenticated_files";

export type CloudinaryUploadResponse = {
  assetId: string;
  publicId: string;
  version: number;
  signature: string;
  secureUrl: string;
  resourceType: "raw";
  format: string;
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

export function createSignedUpload(
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

export function verifyCloudinaryUpload(
  response: CloudinaryUploadResponse,
  expected: {
    target: UploadTarget;
    assignmentId: string;
    format: AllowedFileFormat;
  },
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

export async function destroyCloudinaryAsset(publicId: string): Promise<void> {
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

export function createPrivateDownloadUrl(input: {
  publicId: string;
  format: string;
}): string {
  const { cloudinary: client } = configuredCloudinary();
  return client.utils.private_download_url(input.publicId, input.format, {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: true,
  });
}
