import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { findStudentProfileData } from "@/server/repositories/students/student-profile-repository";
import type { StudentAdminDto } from "@/types/student";
import type { StudentProfileData } from "@/server/repositories/students/student-profile-repository";

type TeacherScopedStudentRow = {
  id: string;
  class_section_id: string;
  mssv: string;
  full_name: string;
  email: string | null;
  nickname: string;
  must_change_nickname: boolean;
  must_change_pin: boolean;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};

type TeacherStudentProfileData = Omit<StudentProfileData, "student"> & {
  student: StudentAdminDto;
};

function toStudentAdminDto(row: TeacherScopedStudentRow): StudentAdminDto {
  return {
    id: row.id,
    classSectionId: row.class_section_id,
    mssv: row.mssv,
    fullName: row.full_name,
    email: row.email,
    nickname: row.nickname,
    mustChangeNickname: row.must_change_nickname,
    mustChangePin: row.must_change_pin,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Resolves a Teacher-visible Student profile. The initial queries bind all
 * three identities (Teacher, ClassSection and Student) before aggregation.
 */
export async function findTeacherStudentProfileData(
  teacherId: string,
  classSectionId: string,
  studentId: string,
): Promise<TeacherStudentProfileData | null> {
  const supabase = createAdminClient();
  const [classSectionResult, studentResult] = await Promise.all([
    supabase
      .from("class_sections")
      .select("id")
      .eq("id", classSectionId)
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    supabase
      .from("students")
      .select(
        "id, class_section_id, mssv, full_name, email, nickname, must_change_nickname, must_change_pin, locked_until, created_at, updated_at",
      )
      .eq("id", studentId)
      .eq("class_section_id", classSectionId)
      .maybeSingle(),
  ]);

  if (classSectionResult.error || studentResult.error) {
    throw new Error("TEACHER_STUDENT_PROFILE_LOOKUP_FAILED");
  }
  if (!classSectionResult.data || !studentResult.data) return null;

  const profile = await findStudentProfileData(studentId, classSectionId);
  if (!profile) return null;

  return {
    student: toStudentAdminDto(studentResult.data as TeacherScopedStudentRow),
    classSection: profile.classSection,
    assignments: profile.assignments,
  };
}
