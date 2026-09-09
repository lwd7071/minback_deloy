import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  finalizeAttachmentSchema,
  uploadIntentSchema,
} from "@/schemas/file-assets";
import {
  createPrivateDownloadUrl,
  createSignedUpload,
  destroyCloudinaryAsset,
  verifyCloudinaryUpload,
} from "@/server/files/cloudinary-service";
import {
  MAX_ACTIVE_ASSIGNMENT_ATTACHMENTS,
  validateUploadFile,
} from "@/server/files/file-policy";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import {
  countActiveAttachments,
  createAttachment,
  findAttachmentForAssignment,
  listActiveAttachments,
  setAttachmentDeletionState,
} from "@/server/repositories/assignments/file-asset-repository";
import type { FileAssetDto, UploadSignatureDto } from "@/types/file-assets";

function attachmentDto(
  row: Awaited<ReturnType<typeof createAttachment>>,
): FileAssetDto {
  return {
    id: row.id,
    originalName: row.original_name,
    bytes: Number(row.bytes),
    format: row.format,
    uploadedAt: row.created_at,
    downloadUrl: `/api/v1/teacher/assignments/${row.assignment_id}/attachments/${row.id}/download`,
  };
}

async function ownedEditableAssignment(assignmentId: string) {
  const { teacher } = await requireTeacher();
  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  if (assignment.status === "closed") {
    throw new ApiError(
      400,
      API_ERROR_CODES.invalidStateTransition,
      "Bài tập đã đóng",
    );
  }
  return { teacher, assignment };
}

export async function signTeacherAttachmentUpload(
  assignmentId: string,
  input: unknown,
): Promise<UploadSignatureDto> {
  const parsed = uploadIntentSchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(400, API_ERROR_CODES.validation, "File không hợp lệ");
  const { teacher } = await ownedEditableAssignment(assignmentId);
  void teacher;
  if (
    (await countActiveAttachments(assignmentId)) >=
    MAX_ACTIVE_ASSIGNMENT_ATTACHMENTS
  ) {
    throw new ApiError(
      409,
      API_ERROR_CODES.conflict,
      "Bài tập chỉ có tối đa 5 file đính kèm",
    );
  }
  const { format } = validateUploadFile(parsed.data);
  return createSignedUpload("assignment-attachment", assignmentId, format);
}

export async function listTeacherAttachments(
  assignmentId: string,
): Promise<FileAssetDto[]> {
  const { teacher } = await requireTeacher();
  if (!(await findAssignmentById(assignmentId, teacher.id))) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  return (await listActiveAttachments(assignmentId)).map((attachment) =>
    attachmentDto(attachment),
  );
}

export async function finalizeTeacherAttachment(
  assignmentId: string,
  input: unknown,
): Promise<FileAssetDto> {
  const parsed = finalizeAttachmentSchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Dữ liệu upload không hợp lệ",
    );
  const { teacher } = await ownedEditableAssignment(assignmentId);
  if (
    (await countActiveAttachments(assignmentId)) >=
    MAX_ACTIVE_ASSIGNMENT_ATTACHMENTS
  ) {
    throw new ApiError(
      409,
      API_ERROR_CODES.conflict,
      "Bài tập chỉ có tối đa 5 file đính kèm",
    );
  }
  const { format } = validateUploadFile(parsed.data.file);
  if (
    !verifyCloudinaryUpload(parsed.data.file, {
      target: "assignment-attachment",
      assignmentId,
      format,
    })
  ) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Dữ liệu upload không xác thực",
    );
  }
  try {
    return attachmentDto(
      await createAttachment(assignmentId, teacher.id, parsed.data.file),
    );
  } catch (error) {
    await destroyCloudinaryAsset(parsed.data.file.publicId).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function deleteTeacherAttachment(
  assignmentId: string,
  attachmentId: string,
): Promise<void> {
  const { teacher } = await ownedEditableAssignment(assignmentId);
  const attachment = await findAttachmentForAssignment(
    assignmentId,
    attachmentId,
  );
  if (!attachment)
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy file đính kèm",
    );
  await setAttachmentDeletionState(
    attachment.id,
    "deletion_pending",
    teacher.id,
  );
  try {
    await destroyCloudinaryAsset(attachment.cloudinary_public_id);
    await setAttachmentDeletionState(attachment.id, "deleted", teacher.id);
  } catch {
    await setAttachmentDeletionState(
      attachment.id,
      "delete_failed",
      teacher.id,
    ).catch(() => undefined);
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể xóa file lưu trữ",
    );
  }
}

export async function getTeacherAttachmentDownload(
  assignmentId: string,
  attachmentId: string,
): Promise<string> {
  const { teacher } = await requireTeacher();
  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment)
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  const attachment = await findAttachmentForAssignment(
    assignmentId,
    attachmentId,
  );
  if (!attachment)
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy file đính kèm",
    );
  return createPrivateDownloadUrl({
    publicId: attachment.cloudinary_public_id,
    format: attachment.format,
  });
}
