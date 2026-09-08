import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { findStudentProfileData } from "@/server/repositories/students/student-profile-repository";
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
    (assignment) => assignment.evaluation?.status === "returned",
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

    // Chỉ evaluation 'returned' mới hiển thị điểm và nhận xét cho sinh viên
    const sanitizedAssignments = data.assignments.map((assignment) => {
      if (
        !assignment.evaluation ||
        assignment.evaluation.status !== "returned"
      ) {
        return {
          ...assignment,
          evaluation: null,
        };
      }
      return assignment;
    });

    return {
      student: {
        mssv: data.student.mssv,
        fullName: data.student.full_name,
        nickname: data.student.nickname,
      },
      classSection: data.classSection,
      progress: calculateProfileProgress(sanitizedAssignments),
      submissionProgress: calculateSubmissionProgress(sanitizedAssignments),
      assignments: sanitizedAssignments,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Mọi lỗi không phải ApiError từ repository đều là lỗi hệ thống
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
}
