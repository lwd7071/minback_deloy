import { z } from "zod";

import { MAX_FILE_BYTES } from "@/server/files/file-policy";

export const uploadIntentSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  bytes: z.number().int().min(1).max(MAX_FILE_BYTES),
});

export const uploadedCloudinaryAssetSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  assetId: z.string().min(1),
  publicId: z.string().min(1),
  version: z.number().int().positive(),
  signature: z.string().min(1),
  secureUrl: z.url(),
  resourceType: z.literal("raw"),
  format: z.string().min(1).max(10),
  bytes: z.number().int().min(1).max(MAX_FILE_BYTES),
});

export const finalizeAttachmentSchema = z.object({
  file: uploadedCloudinaryAssetSchema,
});

export const finalizeSubmissionSchema = z.object({
  files: z.array(uploadedCloudinaryAssetSchema).min(1).max(5),
});

export type UploadedCloudinaryAssetInput = z.infer<
  typeof uploadedCloudinaryAssetSchema
>;
