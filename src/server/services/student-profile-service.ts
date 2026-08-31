import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { findStudentProfileData } from "@/server/repositories/student-profile-repository";
import type { EvaluationStatus } from "@/types/evaluation";
import type { VerifiedStudentSession } from "@/types/student";
import type { StudentProfileDto } from "@/types/student-profile";

export type ProfileProgress = {
  completed: number;
  total: number;
  percentage: number;
};

type ProgressAssignment = {
  evaluation: { status: EvaluationStatus } | null;
};

type SubmissionProgressAssignment = {
  submission: { latestAttempt: unknown | null };
};

export function calculateProfileProgress(
  assignments: readonly ProgressAssignment[],
): ProfileProgress {
  const total = assignments.length;
  if (total === 0) return { completed: 0, total: 0, percentage: 0 };

  const completed = assignments.filter(
    (assignment) =>
      assignment.evaluation?.status === "graded" ||
      assignment.evaluation?.status === "returned",
  ).length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

export function calculateSubmissionProgress(
  assignments: readonly SubmissionProgressAssignment[],
): ProfileProgress {
  const total = assignments.length;
  if (total === 0) return { completed: 0, total: 0, percentage: 0 };
  const completed = assignments.filter(
    (assignment) => assignment.submission.latestAttempt !== null,
  ).length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
  };
}

export async function getStudentProfile(
  session: VerifiedStudentSession,
): Promise<StudentProfileDto> {
  try {
    const data = await findStudentProfileData(
      session.studentId,
      session.classSectionId,
    );
    if (!data) {
      throw new ApiError(
        401,
        API_ERROR_CODES.sessionExpired,
        "Phiên đăng nhập không hợp lệ",
      );
    }

    return {
      student: {
        mssv: data.student.mssv,
        fullName: data.student.full_name,
        nickname: data.student.nickname,
      },
      classSection: data.classSection,
      progress: calculateProfileProgress(data.assignments),
      submissionProgress: calculateSubmissionProgress(data.assignments),
      assignments: data.assignments,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Mọi lỗi không phải ApiError từ repository đều là lỗi hệ thống
    // Không phân biệt lỗi bằng string-matching (fragile pattern)
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Đã xảy ra lỗi hệ thống",
    );
  }
}
