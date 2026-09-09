import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { RepositoryError } from "@/lib/api/errors";
import {
  buildDownloadUrlFromBase,
  buildStudentSubmissionFilesBaseUrl,
  buildTeacherSubmissionFilesBaseUrl,
} from "@/server/files/file-urls";
import {
  findStudentAssignmentContext,
  type StudentAssignmentContext,
} from "@/server/repositories/assignments/assignment-repository";
import type { UploadedCloudinaryAssetInput } from "@/schemas/file-assets";
import type {
  SubmissionAttemptDto,
  SubmissionHistoryDto,
  SubmissionListItemDto,
} from "@/types/submission";

/**
 * @deprecated Đã chuyển sang assignment-repository.ts theo ranh giới Domain (DDD).
 * Re-export để duy trì tương thích ngược.
 */
export { findStudentAssignmentContext, type StudentAssignmentContext };

export type SubmissionSummaryRow = {
  assignmentId: string;
  attemptCount: number;
  latestAttempt: {
    id: string;
    attemptNumber: number;
    submittedAt: string;
    isLate: boolean;
    files: Array<{
      id: string;
      originalName: string;
      bytes: number;
      format: string;
      createdAt: string;
    }>;
  } | null;
};

type SubmissionFileSummary = NonNullable<
  SubmissionSummaryRow["latestAttempt"]
>["files"];

export async function getSubmissionAttemptCount(
  studentId: string,
  assignmentId: string,
): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("submissions")
    .select("latest_attempt_number")
    .eq("student_id", studentId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (error) {
    throw new RepositoryError(
      "SUBMISSION_COUNT_FAILED",
      "Không thể đếm số lượt nộp bài",
      { cause: error },
    );
  }
  return data?.latest_attempt_number ?? 0;
}

export async function createSubmissionAttempt(input: {
  studentId: string;
  classSectionId: string;
  assignmentId: string;
  isLate: boolean;
  files: UploadedCloudinaryAssetInput[];
}): Promise<string> {
  const { data, error } = await createAdminClient().rpc(
    "create_submission_attempt",
    {
      p_student_id: input.studentId,
      p_class_section_id: input.classSectionId,
      p_assignment_id: input.assignmentId,
      p_is_late: input.isLate,
      p_files: input.files,
    },
  );
  if (error) {
    if (error.message.includes("attempt limit")) {
      throw new Error("SUBMISSION_ATTEMPT_LIMIT_REACHED");
    }
    throw new RepositoryError(
      "SUBMISSION_CREATE_FAILED",
      "Không thể nộp bài",
      { cause: error },
    );
  }
  return data as string;
}

export async function listStudentSubmissionSummaries(
  studentId: string,
  assignmentIds: string[],
): Promise<SubmissionSummaryRow[]> {
  if (assignmentIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data: submissions, error: submissionError } = await supabase
    .from("submissions")
    .select("id, assignment_id, latest_attempt_number")
    .eq("student_id", studentId)
    .in("assignment_id", assignmentIds);
  if (submissionError) {
    throw new RepositoryError(
      "SUBMISSION_LIST_FAILED",
      "Không thể lấy danh sách bài nộp",
      { cause: submissionError },
    );
  }
  if (!submissions?.length) return [];

  const submissionIds = submissions.map((row) => row.id as string);
  const { data: attempts, error: attemptError } = await supabase
    .from("submission_attempts")
    .select("id, submission_id, attempt_number, submitted_at, is_late")
    .in("submission_id", submissionIds)
    .order("attempt_number", { ascending: false });
  if (attemptError) {
    throw new RepositoryError(
      "SUBMISSION_ATTEMPT_LIST_FAILED",
      "Không thể lấy danh sách lượt nộp bài",
      { cause: attemptError },
    );
  }
  const latestBySubmission = new Map<
    string,
    Omit<NonNullable<SubmissionSummaryRow["latestAttempt"]>, "files">
  >();
  for (const row of attempts ?? []) {
    const submissionId = row.submission_id as string;
    if (!latestBySubmission.has(submissionId)) {
      latestBySubmission.set(submissionId, {
        id: row.id as string,
        attemptNumber: Number(row.attempt_number),
        submittedAt: row.submitted_at as string,
        isLate: Boolean(row.is_late),
      });
    }
  }
  const latestIds = Array.from(latestBySubmission.values()).map(
    (item) => item.id,
  );
  const { data: files, error: fileError } = latestIds.length
    ? await supabase
        .from("submission_files")
        .select(
          "id, submission_attempt_id, original_name, bytes, format, created_at",
        )
        .in("submission_attempt_id", latestIds)
    : { data: [], error: null };
  if (fileError) {
    throw new RepositoryError(
      "SUBMISSION_FILE_LIST_FAILED",
      "Không thể lấy danh sách file nộp",
      { cause: fileError },
    );
  }
  const filesByAttempt = new Map<string, SubmissionFileSummary>();
  for (const file of files ?? []) {
    const attemptId = file.submission_attempt_id as string;
    const current = filesByAttempt.get(attemptId) ?? [];
    current.push({
      id: file.id as string,
      originalName: file.original_name as string,
      bytes: Number(file.bytes),
      format: file.format as string,
      createdAt: file.created_at as string,
    });
    filesByAttempt.set(attemptId, current);
  }
  return submissions.map((submission) => {
    const latest = latestBySubmission.get(submission.id as string);
    return {
      assignmentId: submission.assignment_id as string,
      attemptCount: Number(submission.latest_attempt_number),
      latestAttempt: latest
        ? { ...latest, files: filesByAttempt.get(latest.id) ?? [] }
        : null,
    };
  });
}

export async function findSubmissionFileForStudent(
  studentId: string,
  assignmentId: string,
  fileId: string,
): Promise<{ publicId: string; format: string } | null> {
  const supabase = createAdminClient();
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id")
    .eq("student_id", studentId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (submissionError) throw new Error("SUBMISSION_FILE_LOOKUP_FAILED");
  if (!submission) return null;
  const { data: attempts, error: attemptError } = await supabase
    .from("submission_attempts")
    .select("id")
    .eq("submission_id", submission.id);
  if (attemptError) throw new Error("SUBMISSION_FILE_LOOKUP_FAILED");
  const attemptIds = (attempts ?? []).map((attempt) => attempt.id as string);
  if (attemptIds.length === 0) return null;
  const { data: file, error: fileError } = await supabase
    .from("submission_files")
    .select("cloudinary_public_id, format")
    .eq("id", fileId)
    .in("submission_attempt_id", attemptIds)
    .maybeSingle();
  if (fileError) throw new Error("SUBMISSION_FILE_LOOKUP_FAILED");
  return file
    ? {
        publicId: file.cloudinary_public_id as string,
        format: file.format as string,
      }
    : null;
}

async function loadSubmissionHistory(
  submissionId: string,
  downloadBaseUrl: string,
): Promise<SubmissionHistoryDto> {
  const supabase = createAdminClient();
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("latest_attempt_number")
    .eq("id", submissionId)
    .single();
  if (submissionError) throw new Error("SUBMISSION_LIST_FAILED");
  const { data: attempts, error: attemptError } = await supabase
    .from("submission_attempts")
    .select("id, attempt_number, submitted_at, is_late")
    .eq("submission_id", submissionId)
    .order("attempt_number", { ascending: false });
  if (attemptError) throw new Error("SUBMISSION_ATTEMPT_LIST_FAILED");
  const attemptIds = (attempts ?? []).map((row) => row.id as string);
  const { data: files, error: fileError } = attemptIds.length
    ? await supabase
        .from("submission_files")
        .select(
          "id, submission_attempt_id, original_name, bytes, format, created_at",
        )
        .in("submission_attempt_id", attemptIds)
    : { data: [], error: null };
  if (fileError) throw new Error("SUBMISSION_FILE_LIST_FAILED");
  const filesByAttempt = new Map<string, SubmissionAttemptDto["files"]>();
  for (const file of files ?? []) {
    const attemptId = file.submission_attempt_id as string;
    const current = filesByAttempt.get(attemptId) ?? [];
    current.push({
      id: file.id as string,
      originalName: file.original_name as string,
      bytes: Number(file.bytes),
      format: file.format as string,
      uploadedAt: file.created_at as string,
      downloadUrl: buildDownloadUrlFromBase(downloadBaseUrl, file.id),
    });
    filesByAttempt.set(attemptId, current);
  }
  const mappedAttempts = (attempts ?? []).map((attempt) => ({
    id: attempt.id as string,
    attemptNumber: Number(attempt.attempt_number),
    submittedAt: attempt.submitted_at as string,
    isLate: Boolean(attempt.is_late),
    files: filesByAttempt.get(attempt.id as string) ?? [],
  }));
  return {
    attemptCount: Number(submission.latest_attempt_number),
    latestAttempt: mappedAttempts[0] ?? null,
    attempts: mappedAttempts,
  };
}

export async function getStudentSubmissionHistory(
  studentId: string,
  assignmentId: string,
): Promise<SubmissionHistoryDto> {
  const { data, error } = await createAdminClient()
    .from("submissions")
    .select("id")
    .eq("student_id", studentId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (error) {
    throw new RepositoryError(
      "SUBMISSION_LIST_FAILED",
      "Không thể lấy lịch sử bài nộp của học sinh",
      { cause: error },
    );
  }
  if (!data) return { attemptCount: 0, latestAttempt: null, attempts: [] };
  return loadSubmissionHistory(
    data.id as string,
    buildStudentSubmissionFilesBaseUrl(assignmentId),
  );
}

export async function getTeacherStudentSubmissionHistory(
  assignmentId: string,
  studentId: string,
): Promise<SubmissionHistoryDto | null> {
  const { data, error } = await createAdminClient()
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) {
    throw new RepositoryError(
      "SUBMISSION_LIST_FAILED",
      "Không thể lấy lịch sử bài nộp",
      { cause: error },
    );
  }
  if (!data) return null;
  return loadSubmissionHistory(
    data.id as string,
    buildTeacherSubmissionFilesBaseUrl(assignmentId),
  );
}

export async function listTeacherLatestSubmissions(
  assignmentId: string,
): Promise<SubmissionListItemDto[]> {
  const { data, error } = await createAdminClient()
    .from("submissions")
    .select(
      "id, student_id, latest_attempt_number, students!inner(id, mssv, full_name, nickname)",
    )
    .eq("assignment_id", assignmentId);
  if (error) {
    throw new RepositoryError(
      "SUBMISSION_LIST_FAILED",
      "Không thể lấy danh sách bài nộp",
      { cause: error },
    );
  }
  return await Promise.all(
    (data ?? []).map(async (row) => {
      const student = row.students as unknown as {
        id: string;
        mssv: string;
        full_name: string;
        nickname: string;
      };
      const history = await loadSubmissionHistory(
        row.id as string,
        buildTeacherSubmissionFilesBaseUrl(assignmentId),
      );
      return {
        student: {
          id: student.id,
          mssv: student.mssv,
          fullName: student.full_name,
          nickname: student.nickname,
        },
        attemptCount: history.attemptCount,
        latestAttempt: history.latestAttempt,
      };
    }),
  );
}

export async function findSubmissionFileForAssignment(
  assignmentId: string,
  fileId: string,
): Promise<{ publicId: string; format: string } | null> {
  const { data, error } = await createAdminClient()
    .from("submission_files")
    .select(
      "cloudinary_public_id, format, submission_attempts!inner(submissions!inner(assignment_id))",
    )
    .eq("id", fileId)
    .eq("submission_attempts.submissions.assignment_id", assignmentId)
    .maybeSingle();
  if (error) {
    throw new RepositoryError(
      "SUBMISSION_FILE_LOOKUP_FAILED",
      "Không thể tìm file bài nộp",
      { cause: error },
    );
  }
  return data
    ? {
        publicId: data.cloudinary_public_id as string,
        format: data.format as string,
      }
    : null;
}
