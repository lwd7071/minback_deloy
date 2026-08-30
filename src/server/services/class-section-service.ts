import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  classSectionCreateSchema,
  classSectionUpdateSchema,
  type ClassSectionCreateInput,
  type ClassSectionListQuery,
  type ClassSectionUpdateInput,
} from "@/schemas/class-section";
import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  createClassSection,
  deleteClassSection,
  findClassSectionById,
  listClassSectionsByTeacher,
  updateClassSection,
} from "@/server/repositories/class-section-repository";
import type { ClassSectionDto } from "@/types/class-section";

function mapUnexpectedError(error: unknown): never {
  if (error instanceof Error && error.message.startsWith("CLASS_SECTION_")) {
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
  throw error;
}

export async function listTeacherClassSections(query: ClassSectionListQuery) {
  const { teacher } = await requireTeacher();
  try {
    const result = await listClassSectionsByTeacher(teacher.id, query);
    return {
      data: result.rows,
      meta: { page: query.page, pageSize: query.pageSize, total: result.total },
    };
  } catch (error) {
    return mapUnexpectedError(error);
  }
}

export async function createTeacherClassSection(
  input: ClassSectionCreateInput,
): Promise<ClassSectionDto> {
  const parsed = classSectionCreateSchema.parse(input);
  const { teacher } = await requireTeacher();
  try {
    const created = await createClassSection(teacher.id, parsed);
    if (!created) {
      throw new ApiError(409, API_ERROR_CODES.conflict, "Mã lớp đã tồn tại");
    }
    return created;
  } catch (error) {
    return mapUnexpectedError(error);
  }
}

export async function getTeacherClassSection(
  classSectionId: string,
): Promise<ClassSectionDto> {
  const { teacher } = await requireTeacher();
  try {
    const section = await findClassSectionById(classSectionId, teacher.id);
    if (!section) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy lớp học phần",
      );
    }
    return section;
  } catch (error) {
    return mapUnexpectedError(error);
  }
}

export async function updateTeacherClassSection(
  classSectionId: string,
  input: ClassSectionUpdateInput,
): Promise<ClassSectionDto> {
  const parsed = classSectionUpdateSchema.parse(input);
  const { teacher } = await requireTeacher();
  try {
    const updated = await updateClassSection(
      classSectionId,
      teacher.id,
      parsed,
    );
    if (!updated) {
      const existing = await findClassSectionById(classSectionId, teacher.id);
      if (!existing) {
        throw new ApiError(
          404,
          API_ERROR_CODES.notFound,
          "Không tìm thấy lớp học phần",
        );
      }
      throw new ApiError(409, API_ERROR_CODES.conflict, "Mã lớp đã tồn tại");
    }
    return updated;
  } catch (error) {
    return mapUnexpectedError(error);
  }
}

export async function deleteTeacherClassSection(
  classSectionId: string,
): Promise<void> {
  const { teacher } = await requireTeacher();
  try {
    const existing = await findClassSectionById(classSectionId, teacher.id);
    if (!existing) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy lớp học phần",
      );
    }
    const result = await deleteClassSection(classSectionId, teacher.id);
    if (result === "conflict") {
      throw new ApiError(
        409,
        API_ERROR_CODES.conflict,
        "Không thể xóa lớp đã có sinh viên hoặc bài tập",
      );
    }
  } catch (error) {
    return mapUnexpectedError(error);
  }
}
