/**
 * src/server/files/file-urls.ts
 *
 * Tập trung hóa toàn bộ logic sinh HTTP REST URL tải file (Separation of Concerns & SRP).
 * Ngăn chặn việc tầng Repository phải tự ghép các chuỗi URL của tầng Web Routing.
 */

export function buildStudentAttachmentDownloadUrl(
  assignmentId: string,
  attachmentId: string,
): string {
  return `/api/v1/student/assignments/${assignmentId}/attachments/${attachmentId}/download`;
}

export function buildStudentSubmissionFileDownloadUrl(
  assignmentId: string,
  fileId: string,
): string {
  return `/api/v1/student/assignments/${assignmentId}/submissions/files/${fileId}/download`;
}

export function buildStudentSubmissionFilesBaseUrl(
  assignmentId: string,
): string {
  return `/api/v1/student/assignments/${assignmentId}/submission-files`;
}

export function buildTeacherSubmissionFilesBaseUrl(
  assignmentId: string,
): string {
  return `/api/v1/teacher/assignments/${assignmentId}/submission-files`;
}

export function buildDownloadUrlFromBase(
  baseUrl: string,
  fileId: string,
): string {
  return `${baseUrl}/${fileId}/download`;
}
