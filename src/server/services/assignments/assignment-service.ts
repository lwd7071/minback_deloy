import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
} from "@/schemas/assignment";
import { findClassSectionById } from "@/server/repositories/classes/class-section-repository";
import {
  createAssignment,
  deleteAssignmentWithEvaluations,
  deleteDraftAssignment,
  findAssignmentById,
  hasEvaluations,
  listAssignmentsByClassSection,
  listTeacherAssignmentSummaries as listAssignmentSummaries,
  updateAssignment,
} from "@/server/repositories/assignments/assignment-repository";
import type {
  AssignmentDto,
  AssignmentStatus,
  TeacherAssignmentSummaryDto,
} from "@/types/assignment";

function unexpected(error: unknown): never {
  if (error instanceof ApiError) throw error;
  console.error("[assignment-service unexpected error]", error);
  throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
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
  const assignedTime = new Date(
    assignedDate.includes("T")
      ? assignedDate
      : `${assignedDate}T00:00:00+07:00`,
  ).getTime();
  const dueTime = new Date(
    dueDate.includes("T") ? dueDate : `${dueDate}T23:59:59.999+07:00`,
  ).getTime();
  if (dueTime < assignedTime) {
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

async function assertUniqueAssignmentTitle(
  classSectionId: string,
  title: string,
  excludeAssignmentId?: string,
): Promise<void> {
  const normalizedTitle = title.trim().toLocaleLowerCase();
  const assignments = await listAssignmentsByClassSection(classSectionId);
  const duplicate = assignments.some(
    (assignment) =>
      assignment.id !== excludeAssignmentId &&
      assignment.title.trim().toLocaleLowerCase() === normalizedTitle,
  );

  if (duplicate) {
    throw new ApiError(
      409,
      API_ERROR_CODES.conflict,
      "Tên bài tập đã tồn tại trong lớp học phần này",
    );
  }
}

export async function listTeacherAssignments(
  classSectionId: string,
  teacherId: string,
): Promise<AssignmentDto[]> {
  try {
    await requireOwnedClassSection(classSectionId, teacherId);
    return await listAssignmentsByClassSection(classSectionId);
  } catch (error) {
    return unexpected(error);
  }
}

export async function listTeacherAssignmentSummaries(
  classSectionId: string,
  teacherId: string,
): Promise<TeacherAssignmentSummaryDto[]> {
  try {
    await requireOwnedClassSection(classSectionId, teacherId);
    return await listAssignmentSummaries(classSectionId);
  } catch (error) {
    return unexpected(error);
  }
}

export async function createTeacherAssignment(
  classSectionId: string,
  input: unknown,
  teacherId: string,
): Promise<AssignmentDto> {
  try {
    await requireOwnedClassSection(classSectionId, teacherId);
    const parsed = assignmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu không hợp lệ",
      );
    }
    await assertUniqueAssignmentTitle(classSectionId, parsed.data.title);
    return await createAssignment(classSectionId, parsed.data);
  } catch (error) {
    return unexpected(error);
  }
}

export async function getTeacherAssignment(
  assignmentId: string,
  teacherId: string,
): Promise<AssignmentDto> {
  try {
    const assignment = await findAssignmentById(assignmentId, teacherId);
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
  teacherId: string,
): Promise<AssignmentDto> {
  try {
    const current = await findAssignmentById(assignmentId, teacherId);
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
    if (parsed.data.title !== undefined) {
      await assertUniqueAssignmentTitle(
        current.classSectionId,
        parsed.data.title,
        current.id,
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
  teacherId: string,
  options?: { force?: boolean },
): Promise<void> {
  try {
    const assignment = await findAssignmentById(assignmentId, teacherId);
    if (!assignment) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    const evaluationsExist = await hasEvaluations(assignmentId);
    if (evaluationsExist) {
      if (!options?.force) {
        throw new ApiError(
          409,
          API_ERROR_CODES.conflict,
          "Không thể xóa bài tập đã có bài nộp hoặc đánh giá",
        );
      }
      await deleteAssignmentWithEvaluations(assignmentId);
      return;
    }
    if (!(await deleteDraftAssignment(assignmentId))) {
      throw new ApiError(
        409,
        API_ERROR_CODES.conflict,
        "Không thể xóa bài tập đã có dữ liệu sinh viên nộp bài",
      );
    }
  } catch (error) {
    return unexpected(error);
  }
}
