import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignment-repository";
import {
  findSubmissionFileForAssignment,
  getTeacherStudentSubmissionHistory,
  listTeacherLatestSubmissions,
} from "@/server/repositories/submission-repository";
import { createPrivateDownloadUrl } from "@/server/files/cloudinary-service";
import type {
  SubmissionHistoryDto,
  SubmissionListItemDto,
} from "@/types/submission";

export async function listTeacherSubmissions(
  assignmentId: string,
): Promise<SubmissionListItemDto[]> {
  const { teacher } = await requireTeacher();
  if (!(await findAssignmentById(assignmentId, teacher.id))) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  return listTeacherLatestSubmissions(assignmentId);
}

export async function getTeacherStudentSubmissions(
  assignmentId: string,
  studentId: string,
): Promise<SubmissionHistoryDto> {
  const { teacher } = await requireTeacher();
  if (!(await findAssignmentById(assignmentId, teacher.id))) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  const history = await getTeacherStudentSubmissionHistory(
    assignmentId,
    studentId,
  );
  if (!history) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài nộp");
  }
  return history;
}

export async function getTeacherSubmissionFileDownload(
  assignmentId: string,
  fileId: string,
): Promise<string> {
  const { teacher } = await requireTeacher();
  if (!(await findAssignmentById(assignmentId, teacher.id))) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  const file = await findSubmissionFileForAssignment(assignmentId, fileId);
  if (!file) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy file bài nộp",
    );
  }
  return createPrivateDownloadUrl(file);
}
