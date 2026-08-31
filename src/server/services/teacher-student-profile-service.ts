import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findTeacherStudentProfileData } from "@/server/repositories/teacher-student-profile-repository";
import { calculateProfileProgress } from "@/server/services/student-profile-service";
import type { TeacherStudentProfileDto } from "@/types/student-profile";

export async function getTeacherStudentProfile(
  classSectionId: string,
  studentId: string,
): Promise<TeacherStudentProfileDto> {
  try {
    const { teacher } = await requireTeacher();
    const data = await findTeacherStudentProfileData(
      teacher.id,
      classSectionId,
      studentId,
    );

    if (!data) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy hồ sơ học tập",
      );
    }

    return {
      student: data.student,
      classSection: data.classSection,
      progress: calculateProfileProgress(data.assignments),
      assignments: data.assignments,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (
      error instanceof Error &&
      error.message.startsWith("TEACHER_STUDENT_PROFILE_")
    ) {
      throw new ApiError(
        500,
        API_ERROR_CODES.internal,
        "Đã xảy ra lỗi hệ thống",
      );
    }
    throw error;
  }
}
