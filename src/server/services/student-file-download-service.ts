import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireFullStudentSession } from "@/server/auth/student-session";
import { createPrivateDownloadUrl } from "@/server/files/cloudinary-service";
import { findAttachmentForAssignment } from "@/server/repositories/file-asset-repository";
import {
  findStudentAssignmentContext,
  findSubmissionFileForStudent,
} from "@/server/repositories/submission-repository";

async function visibleAssignment(assignmentId: string) {
  const session = await requireFullStudentSession();
  const assignment = await findStudentAssignmentContext(
    assignmentId,
    session.classSectionId,
  );
  if (!assignment || assignment.status === "draft") {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  return { session, assignment };
}

export async function getStudentAttachmentDownload(
  assignmentId: string,
  attachmentId: string,
): Promise<string> {
  await visibleAssignment(assignmentId);
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

export async function getStudentSubmissionFileDownload(
  assignmentId: string,
  fileId: string,
): Promise<string> {
  const { session } = await visibleAssignment(assignmentId);
  const file = await findSubmissionFileForStudent(
    session.studentId,
    assignmentId,
    fileId,
  );
  if (!file)
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy file bài nộp",
    );
  return createPrivateDownloadUrl(file);
}
