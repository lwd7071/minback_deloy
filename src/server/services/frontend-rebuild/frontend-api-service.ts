import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { classSectionListQuerySchema } from "@/schemas/class-section";
import {
  gradebookConfigSchema,
  gradebookQuerySchema,
} from "@/schemas/frontend-rebuild";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { hashRateLimitKey } from "@/server/repositories/students/login-rate-limit-repository";
import {
  consumePublicLookupRateLimit,
  findClassSectionById,
  findPublicClassSectionByCode,
  listClassSectionSummaries,
} from "@/server/repositories/classes/class-section-repository";
import { getGradebookRows } from "@/server/repositories/evaluations/gradebook-repository";
import { normalizePublicClassCode } from "@/server/services/frontend-rebuild/frontend-rebuild-service";
import { normalizeIp } from "@/server/services/students/student-auth-service";

export async function getPublicClassSection(
  code: string,
  rawIp: string | null,
) {
  let normalized: string;
  try {
    normalized = normalizePublicClassCode(code);
  } catch {
    throw new ApiError(400, API_ERROR_CODES.validation, "Mã lớp không hợp lệ");
  }
  const keyHash = hashRateLimitKey(`public-class-lookup:${normalizeIp(rawIp)}`);
  if (!(await consumePublicLookupRateLimit(keyHash))) {
    throw new ApiError(
      429,
      API_ERROR_CODES.loginRateLimited,
      "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
    );
  }
  const result = await findPublicClassSectionByCode(normalized);
  if (!result) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy lớp học phần",
    );
  }
  return result;
}

export async function getTeacherClassSectionSummaries(input: unknown) {
  const { supabase, teacher } = await requireTeacher();
  const parsed = classSectionListQuerySchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Phân trang không hợp lệ",
    );
  const query = parsed.data;
  const result = await listClassSectionSummaries(supabase, teacher.id, query);
  return {
    data: result.rows,
    meta: { page: query.page, pageSize: query.pageSize, total: result.total },
    metrics: result.metrics,
    filterCounts: result.filterCounts,
  };
}

export async function getTeacherGradebook(
  classSectionId: string,
  input: unknown,
) {
  const { supabase, teacher } = await requireTeacher();
  const parsed = gradebookQuerySchema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Phân trang không hợp lệ",
    );
  const query = parsed.data;
  if (!(await findClassSectionById(classSectionId, teacher.id))) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy lớp học phần",
    );
  }
  return getGradebookRows(supabase, classSectionId, query);
}

export async function updateTeacherGradebookConfig(
  classSectionId: string,
  input: unknown,
) {
  const { supabase, teacher } = await requireTeacher();
  const parsed = gradebookConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Cấu hình trọng số không hợp lệ",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  if (!(await findClassSectionById(classSectionId, teacher.id))) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy lớp học phần",
    );
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select("id")
    .eq("class_section_id", classSectionId);
  if (assignmentsError) {
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể lưu cấu hình bảng điểm",
    );
  }
  const assignmentIds = new Set(
    (assignments ?? []).map((assignment) => assignment.id),
  );
  if (
    assignmentIds.size !== parsed.data.assignments.length ||
    parsed.data.assignments.some(
      (item) => !assignmentIds.has(item.assignmentId),
    )
  ) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Cấu hình phải bao gồm chính xác các bài tập trong lớp",
    );
  }

  const { error } = await supabase.rpc("update_teacher_gradebook_config", {
    p_class_section_id: classSectionId,
    p_assignments: parsed.data.assignments,
  });
  if (error) {
    throw new ApiError(
      error.code === "22023" ? 400 : 500,
      error.code === "22023"
        ? API_ERROR_CODES.validation
        : API_ERROR_CODES.internal,
      error.code === "22023"
        ? "Cấu hình trọng số không hợp lệ"
        : "Không thể lưu cấu hình bảng điểm",
    );
  }
  return { saved: true };
}
