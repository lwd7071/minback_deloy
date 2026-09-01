export type NormalizedCloudinaryUpload = {
  originalName: string;
  assetId: string;
  publicId: string;
  version: number;
  signature: string;
  secureUrl: string;
  resourceType: "raw";
  format: string;
  bytes: number;
};

function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function fileExtension(originalName: string): string | null {
  const extension = originalName.trim().split(".").pop()?.toLowerCase();
  return extension && extension !== originalName.toLowerCase()
    ? extension
    : null;
}

export function normalizeCloudinaryRawUpload(
  body: unknown,
  originalName: string,
): NormalizedCloudinaryUpload {
  if (typeof body !== "object" || body === null) {
    throw new Error("Phản hồi từ hệ thống lưu trữ không hợp lệ");
  }

  const response = body as Record<string, unknown>;
  const assetId = requiredString(response.asset_id);
  const publicId = requiredString(response.public_id);
  const signature = requiredString(response.signature);
  const secureUrl = requiredString(response.secure_url);
  const format =
    requiredString(response.format)?.toLowerCase() ??
    fileExtension(originalName);

  if (
    !assetId ||
    !publicId ||
    !signature ||
    !secureUrl ||
    !format ||
    response.resource_type !== "raw" ||
    typeof response.version !== "number" ||
    !Number.isInteger(response.version) ||
    typeof response.bytes !== "number" ||
    !Number.isInteger(response.bytes)
  ) {
    throw new Error("Phản hồi từ hệ thống lưu trữ không hợp lệ");
  }

  return {
    originalName,
    assetId,
    publicId,
    version: response.version,
    signature,
    secureUrl,
    resourceType: "raw",
    format,
    bytes: response.bytes,
  };
}
