/**
 * src/server/services/student-management-service.ts
 *
 * Business logic cho Teacher quản lý Student trong một ClassSection.
 * Tất cả operation đều yêu cầu Teacher đã xác thực và đúng context lớp.
 */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  findStudentById,
  listStudentsByClassSection,
  updateStudentByTeacher,
} from "@/server/repositories/student-repository";
import {
  DEFAULT_INITIAL_PIN,
  resetStudentPin,
  resetStudentPinToDefault,
} from "@/server/services/students/student-auth-service";
import type { StudentAdminDto } from "@/types/student";
import type {
  StudentAdminUpdateInput,
  StudentListQuery,
} from "@/schemas/student-auth";

/**
 * Xác thực Teacher đang đăng nhập và kiểm tra họ có quyền trên ClassSection này không.
 * @returns teacherId
 */
async function requireTeacherClassAccess(
  classSectionId: string,
): Promise<string> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new ApiError(
      401,
      API_ERROR_CODES.unauthenticated,
      "Vui lòng đăng nhập Teacher/Admin",
    );
  }

  // Kiểm tra ClassSection có thuộc Teacher này không
  const { data: classData, error: classError } = await supabase
    .from("class_sections")
    .select("id")
    .eq("id", classSectionId)
    .eq("teacher_id", authData.user.id) // scope theo teacher_id
    .maybeSingle();

  if (classError || !classData) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy lớp học phần",
    );
  }

  return authData.user.id;
}

// ─── List Students ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/teacher/class-sections/:classSectionId/students
 * Lấy danh sách Student trong lớp có phân trang và tìm kiếm.
 */
export async function listStudentsInClass(
  classSectionId: string,
  query: StudentListQuery,
): Promise<{
  students: StudentAdminDto[];
  meta: { page: number; pageSize: number; total: number };
}> {
  await requireTeacherClassAccess(classSectionId);

  const { students, total } = await listStudentsByClassSection(
    classSectionId,
    query,
  );

  return {
    students,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
    },
  };
}

// ─── Get Student ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/teacher/class-sections/:classSectionId/students/:studentId
 */
export async function getStudentInClass(
  classSectionId: string,
  studentId: string,
): Promise<StudentAdminDto> {
  await requireTeacherClassAccess(classSectionId);

  const student = await findStudentById(studentId, classSectionId);

  if (!student) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy sinh viên trong lớp này",
    );
  }

  return student;
}

// ─── Update Student ─────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/teacher/class-sections/:classSectionId/students/:studentId
 * Cập nhật fullName, email, nickname.
 * KHÔNG tự thay đổi credentials (pin, must_change_*).
 */
export async function updateStudentInClass(
  classSectionId: string,
  studentId: string,
  input: StudentAdminUpdateInput,
): Promise<StudentAdminDto> {
  await requireTeacherClassAccess(classSectionId);

  // Kiểm tra Student tồn tại trong lớp này
  const existing = await findStudentById(studentId, classSectionId);
  if (!existing) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy sinh viên trong lớp này",
    );
  }

  const updated = await updateStudentByTeacher(studentId, classSectionId, {
    fullName: input.fullName,
    email: input.email, // Truyền thẳng: null = xóa email; string = cập nhật; undefined = không thay đổi
    nickname: input.nickname,
  });

  if (!updated) {
    // updateStudentByTeacher trả null khi có unique constraint violation
    throw new ApiError(
      409,
      API_ERROR_CODES.conflict,
      "Nickname này đã được sử dụng trong lớp. Vui lòng chọn nickname khác.",
    );
  }

  return updated;
}

// ─── Reset PIN ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/teacher/class-sections/:classSectionId/students/:studentId/reset-pin
 * Reset PIN của Student: sinh PIN mới, revoke toàn bộ session cũ.
 * Trả initialPin một lần duy nhất — Teacher phân phối riêng.
 */
export async function resetStudentPinByTeacher(
  classSectionId: string,
  studentId: string,
): Promise<{ studentId: string; mustChangePin: boolean; initialPin: string }> {
  await requireTeacherClassAccess(classSectionId);

  // Kiểm tra Student tồn tại trong lớp này
  const existing = await findStudentById(studentId, classSectionId);
  if (!existing) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy sinh viên trong lớp này",
    );
  }

  const result = await resetStudentPinToDefault(studentId);
  return { ...result, initialPin: DEFAULT_INITIAL_PIN };
}
