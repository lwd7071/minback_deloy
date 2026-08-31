export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES_PER_ATTEMPT = 5;
export const MAX_ACTIVE_ASSIGNMENT_ATTACHMENTS = 5;
export const MAX_SUBMISSION_ATTEMPTS = 10;

export const ALLOWED_FILE_FORMATS = [
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "txt",
  "zip",
  "jpg",
  "jpeg",
  "png",
] as const;

export type AllowedFileFormat = (typeof ALLOWED_FILE_FORMATS)[number];

export function validateUploadFile(input: {
  originalName: string;
  bytes: number;
}): { format: AllowedFileFormat } {
  if (!Number.isInteger(input.bytes) || input.bytes < 1) {
    throw new Error("FILE_SIZE_INVALID");
  }
  if (input.bytes > MAX_FILE_BYTES) throw new Error("FILE_TOO_LARGE");

  const extension = input.originalName.trim().split(".").pop()?.toLowerCase();
  if (
    !extension ||
    !ALLOWED_FILE_FORMATS.includes(extension as AllowedFileFormat)
  ) {
    throw new Error("FILE_FORMAT_NOT_ALLOWED");
  }

  return { format: extension as AllowedFileFormat };
}
