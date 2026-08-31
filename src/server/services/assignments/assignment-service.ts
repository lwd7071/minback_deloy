import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
} from "@/schemas/assignment";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findClassSectionById } from "@/server/repositories/class-section-repository";
import {
  createAssignment,
  deleteDraftAssignment,
  findAssignmentById,
  hasEvaluations,
  listAssignmentsByClassSection,
  updateAssignment,
} from "@/server/repositories/assignment-repository";
import type { AssignmentDto, AssignmentStatus } from "@/types/assignment";

function unexpected(error: unknown): never {
  if (error instanceof Error && error.message.startsWith("ASSIGNMENT_")) {
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
  throw error;
}

export function isAllowedAssignmentStatusTransition(
  previous: AssignmentStatus,
  next: AssignmentStatus,
): boolean {
  return (
    previous === next ||
    (previous === "draft" && next === "published") ||
    (previous === "published" && next === "closed") ||
    (previous === "closed" && next === "published")
  );
}

function assertAllowedStatusTransition(
  previous: AssignmentStatus,
  next: AssignmentStatus,
): void {
  if (!isAllowedAssignmentStatusTransition(previous, next)) {
    throw new ApiError(
      400,
      API_ERROR_CODES.invalidStateTransition,
      "Không thể chuyển trạng thái bài tập",
    );
  }
}

function assertValidDates(assignedDate: string, dueDate: string): void {
  if (dueDate < assignedDate) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Hạn nộp phải sau hoặc bằng ngày giao",
    );
  }
}

async function requireOwnedClassSection(
  classSectionId: string,
  teacherId: string,
): Promise<void> {
  const classSection = await findClassSectionById(classSectionId, teacherId);
  if (!classSection) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy lớp học phần",
    );
  }
}

export async function listTeacherAssignments(
  classSectionId: string,
): Promise<AssignmentDto[]> {
  try {
    const { teacher } = await requireTeacher();
    await requireOwnedClassSection(classSectionId, teacher.id);
    return await listAssignmentsByClassSection(classSectionId);
  } catch (error) {
    return unexpected(error);
  }
}

export async function createTeacherAssignment(
  classSectionId: string,
  input: unknown,
): Promise<AssignmentDto> {
  try {
    const { teacher } = await requireTeacher();
    await requireOwnedClassSection(classSectionId, teacher.id);
    const parsed = assignmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }
    return await createAssignment(classSectionId, parsed.data);
  } catch (error) {
    return unexpected(error);
  }
}

export async function getTeacherAssignment(
  assignmentId: string,
): Promise<AssignmentDto> {
  const { teacher } = await requireTeacher();
  try {
    const assignment = await findAssignmentById(assignmentId, teacher.id);
    if (!assignment) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    return assignment;
  } catch (error) {
    return unexpected(error);
  }
}

export async function updateTeacherAssignment(
  assignmentId: string,
  input: unknown,
): Promise<AssignmentDto> {
  const { teacher } = await requireTeacher();
  try {
    const current = await findAssignmentById(assignmentId, teacher.id);
    if (!current) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    const parsed = assignmentUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }
    if (parsed.data.status !== undefined) {
      assertAllowedStatusTransition(current.status, parsed.data.status);
    }
    assertValidDates(
      parsed.data.assignedDate ?? current.assignedDate,
      parsed.data.dueDate ?? current.dueDate,
    );
    return await updateAssignment(assignmentId, parsed.data);
  } catch (error) {
    return unexpected(error);
  }
}

export async function deleteTeacherAssignment(
  assignmentId: string,
): Promise<void> {
  const { teacher } = await requireTeacher();
  try {
    const assignment = await findAssignmentById(assignmentId, teacher.id);
    if (!assignment) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    if (assignment.status !== "draft" || (await hasEvaluations(assignmentId))) {
      throw new ApiError(
        409,
        API_ERROR_CODES.conflict,
        "Chỉ có thể xóa bài tập nháp chưa có đánh giá",
      );
    }
    if (!(await deleteDraftAssignment(assignmentId))) {
      throw new ApiError(
        409,
        API_ERROR_CODES.conflict,
        "Chỉ có thể xóa bài tập nháp chưa có đánh giá",
      );
    }
  } catch (error) {
    return unexpected(error);
  }
}
