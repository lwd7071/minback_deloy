import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { classSectionListQuerySchema } from "@/schemas/class-section";
import { gradebookQuerySchema } from "@/schemas/frontend-rebuild";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { hashRateLimitKey } from "@/server/repositories/login-rate-limit-repository";
import {
  consumePublicLookupRateLimit,
  findPublicClassSectionByCode,
  getGradebookRows,
  listClassSectionSummaries,
} from "@/server/repositories/frontend-rebuild-repository";
import { findClassSectionById } from "@/server/repositories/class-section-repository";
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
