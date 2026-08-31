export type FileAssetDto = {
  id: string;
  originalName: string;
  bytes: number;
  format: string;
  uploadedAt: string;
  downloadUrl: string;
};

export type UploadSignatureDto = {
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadPreset: string;
  uploadUrl: string;
  type: "authenticated";
};
