import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  finalizeSubmissionSchema,
  uploadIntentSchema,
} from "@/schemas/file-assets";
import { requireFullStudentSession } from "@/server/auth/student-session";
import {
  createSignedUpload,
  destroyCloudinaryAsset,
  verifyCloudinaryUpload,
} from "@/server/files/cloudinary-service";
import {
  MAX_SUBMISSION_ATTEMPTS,
  validateUploadFile,
} from "@/server/files/file-policy";
import {
  createSubmissionAttempt,
  findStudentAssignmentContext,
  getSubmissionAttemptCount,
  getStudentSubmissionHistory as getStudentSubmissionHistoryFromRepository,
} from "@/server/repositories/submission-repository";
import type { UploadSignatureDto } from "@/types/file-assets";
import type { SubmissionHistoryDto } from "@/types/submission";

export function isSubmissionLate(dueDate: string): boolean {
  return Date.now() > new Date(`${dueDate}T23:59:59.999+07:00`).getTime();
}

async function currentPublishedAssignment(assignmentId: string) {
  const session = await requireFullStudentSession();
  const assignment = await findStudentAssignmentContext(
    assignmentId,
    session.classSectionId,
  );
  if (!assignment)
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  if (assignment.status !== "published") {
    throw new ApiError(
      400,
      API_ERROR_CODES.invalidStateTransition,
      "Bài tập không nhận bài nộp",
    );
  }
  return { session, assignment };
}

export async function signStudentSubmissionUpload(
  assignmentId: string,
  input: unknown,
): Promise<UploadSignatureDto> {
  const parsed = uploadIntentSchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(400, API_ERROR_CODES.validation, "File không hợp lệ");
  const { session } = await currentPublishedAssignment(assignmentId);
  if (
    (await getSubmissionAttemptCount(session.studentId, assignmentId)) >=
    MAX_SUBMISSION_ATTEMPTS
  ) {
    throw new ApiError(
      409,
      API_ERROR_CODES.conflict,
      "Đã đạt tối đa 10 lần nộp bài",
    );
  }
  const { format } = validateUploadFile(parsed.data);
  return createSignedUpload("submission", assignmentId, format);
}

export async function finalizeStudentSubmission(
  assignmentId: string,
  input: unknown,
): Promise<{ attemptId: string; isLate: boolean }> {
  const parsed = finalizeSubmissionSchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Dữ liệu upload không hợp lệ",
    );
  const { session, assignment } =
    await currentPublishedAssignment(assignmentId);
  const uniqueAssets = new Set(parsed.data.files.map((file) => file.assetId));
  if (uniqueAssets.size !== parsed.data.files.length)
    throw new ApiError(400, API_ERROR_CODES.validation, "File upload bị trùng");
  for (const file of parsed.data.files) {
    const { format } = validateUploadFile(file);
    if (
      !verifyCloudinaryUpload(file, {
        target: "submission",
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
  }
  const late = isSubmissionLate(assignment.due_date);
  try {
    const attemptId = await createSubmissionAttempt({
      studentId: session.studentId,
      classSectionId: session.classSectionId,
      assignmentId,
      isLate: late,
      files: parsed.data.files,
    });
    return { attemptId, isLate: late };
  } catch (error) {
    await Promise.all(
      parsed.data.files.map((file) =>
        destroyCloudinaryAsset(file.publicId).catch(() => undefined),
      ),
    );
    if (
      error instanceof Error &&
      error.message === "SUBMISSION_ATTEMPT_LIMIT_REACHED"
    ) {
      throw new ApiError(
        409,
        API_ERROR_CODES.conflict,
        "Đã đạt tối đa 10 lần nộp bài",
      );
    }
    throw error;
  }
}

export async function getStudentSubmissionHistory(
  assignmentId: string,
): Promise<SubmissionHistoryDto> {
  const session = await requireFullStudentSession();
  const assignment = await findStudentAssignmentContext(
    assignmentId,
    session.classSectionId,
  );
  if (!assignment || assignment.status === "draft") {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  return getStudentSubmissionHistoryFromRepository(
    session.studentId,
    assignmentId,
  );
}
