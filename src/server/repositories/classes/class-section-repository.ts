import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { RepositoryError } from "@/lib/api/errors";
import type {
  ClassSectionCreateInput,
  ClassSectionListQuery,
  ClassSectionUpdateInput,
} from "@/schemas/class-section";
import type { ClassSectionDto } from "@/types/class-section";
import type {
  ClassSectionSummaryDto,
  ClassSummaryFilterCounts,
  PublicClassSectionDto,
} from "@/types/frontend-rebuild";
import type { SupabaseClient } from "@supabase/supabase-js";

type ClassSectionRow = {
  id: string;
  code: string;
  name: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
};

function toDto(row: ClassSectionRow): ClassSectionDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AtomicStudentSetupInput = {
  studentId: string;
  mssv: string;
  fullName: string;
  email: string | null;
  nickname: string;
  pinHash: string;
};

export async function createClassSectionWithStudents(
  supabase: SupabaseClient,
  input: ClassSectionCreateInput,
  students: AtomicStudentSetupInput[],
): Promise<ClassSectionDto | null> {
  const { data, error } = await supabase.rpc(
    "create_class_section_with_students",
    {
      p_code: input.code,
      p_name: input.name,
      p_students: students,
    },
  );

  if (error) {
    if (error.code === "23505") return null;
    throw new RepositoryError(
      "CLASS_SECTION_SETUP_FAILED",
      "Không thể khởi tạo lớp học",
      { cause: error },
    );
  }
  return data as ClassSectionDto;
}

export async function listClassSectionsByTeacher(
  teacherId: string,
  query: ClassSectionListQuery,
): Promise<{ rows: ClassSectionDto[]; total: number }> {
  const supabase = createAdminClient();
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const { data, count, error } = await supabase
    .from("class_sections")
    .select("id, code, name, teacher_id, created_at, updated_at", {
      count: "exact",
    })
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new RepositoryError(
      "CLASS_SECTION_LIST_FAILED",
      "Không thể lấy danh sách lớp học",
      { cause: error },
    );
  }
  return { rows: (data as ClassSectionRow[]).map(toDto), total: count ?? 0 };
}

export async function findClassSectionById(
  classSectionId: string,
  teacherId: string,
): Promise<ClassSectionDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("class_sections")
    .select("id, code, name, teacher_id, created_at, updated_at")
    .eq("id", classSectionId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "CLASS_SECTION_GET_FAILED",
      "Không thể lấy thông tin lớp học",
      { cause: error },
    );
  }
  return data ? toDto(data as ClassSectionRow) : null;
}

export async function createClassSection(
  teacherId: string,
  input: ClassSectionCreateInput,
): Promise<ClassSectionDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("class_sections")
    .insert({ teacher_id: teacherId, code: input.code, name: input.name })
    .select("id, code, name, teacher_id, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw new RepositoryError(
      "CLASS_SECTION_CREATE_FAILED",
      "Không thể tạo lớp học",
      { cause: error },
    );
  }
  return toDto(data as ClassSectionRow);
}

export async function updateClassSection(
  classSectionId: string,
  teacherId: string,
  input: ClassSectionUpdateInput,
): Promise<ClassSectionDto | null> {
  const supabase = createAdminClient();
  const updates: Record<string, string> = {};
  if (input.code !== undefined) updates.code = input.code;
  if (input.name !== undefined) updates.name = input.name;

  const { data, error } = await supabase
    .from("class_sections")
    .update(updates)
    .eq("id", classSectionId)
    .eq("teacher_id", teacherId)
    .select("id, code, name, teacher_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw new RepositoryError(
      "CLASS_SECTION_UPDATE_FAILED",
      "Không thể cập nhật lớp học",
      { cause: error },
    );
  }
  return data ? toDto(data as ClassSectionRow) : null;
}

export async function deleteClassSection(
  classSectionId: string,
  teacherId: string,
): Promise<"deleted" | "conflict"> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("class_sections")
    .delete()
    .eq("id", classSectionId)
    .eq("teacher_id", teacherId);

  if (!error) return "deleted";
  if (error.code === "23503") return "conflict";
  throw new RepositoryError(
    "CLASS_SECTION_DELETE_FAILED",
    "Không thể xóa lớp học",
    { cause: error },
  );
}

export async function findPublicClassSectionByCode(
  code: string,
): Promise<PublicClassSectionDto | null> {
  const { data, error } = await createAdminClient()
    .from("class_sections")
    .select("code, name")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    throw new RepositoryError(
      "PUBLIC_CLASS_SECTION_LOOKUP_FAILED",
      "Không thể tra cứu thông tin lớp học công khai",
      { cause: error },
    );
  }
  return data as PublicClassSectionDto | null;
}

export async function consumePublicLookupRateLimit(
  keyHash: string,
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc(
    "consume_public_lookup_rate_limit",
    { p_key_hash: keyHash },
  );
  if (error) {
    throw new RepositoryError(
      "PUBLIC_LOOKUP_RATE_LIMIT_FAILED",
      "Lỗi kiểm tra giới hạn tần suất tra cứu",
      { cause: error },
    );
  }
  return Boolean(data);
}

export async function listClassSectionSummaries(
  supabase: SupabaseClient,
  teacherId: string,
  query: ClassSectionListQuery,
): Promise<{
  rows: ClassSectionSummaryDto[];
  total: number;
  metrics: {
    classCount: number;
    studentCount: number;
    assignmentCount: number;
    completedCount: number;
    gradingTotal: number;
    gradingPercentage: number;
  };
  filterCounts: ClassSummaryFilterCounts;
}> {
  const fetchPage = async (offset: number, limit: number) =>
    supabase.rpc("list_class_section_summaries", {
      p_teacher_id: teacherId,
      p_offset: offset,
      p_limit: limit,
      p_search: query.search || null,
      p_progress: query.progress,
      p_sort: query.sort,
    });

  // Fetch the page and aggregate facets concurrently.
  const [initialPage, facetsResult] = await Promise.all([
    fetchPage((query.page - 1) * query.pageSize, query.pageSize),
    supabase
      .rpc("get_class_section_summary_facets", {
        p_teacher_id: teacherId,
        p_search: query.search || null,
      })
      .then(
        (res) => res,
        () => ({ data: null, error: true }),
      ),
  ]);

  if (initialPage.error) {
    throw new RepositoryError(
      "CLASS_SECTION_SUMMARY_LIST_FAILED",
      "Không thể lấy tóm tắt lớp học",
      {
        cause: new Error(
          initialPage.error.code ?? "CLASS_SECTION_SUMMARY_RPC_FAILED",
        ),
      },
    );
  }

  let pageData = initialPage.data;
  let records = (pageData ?? []) as Array<Record<string, unknown>>;
  if (records.length === 0 && query.page > 1) {
    const fallback = await fetchPage(0, 1);
    if (fallback.error) throw new Error("CLASS_SECTION_SUMMARY_LIST_FAILED");
    records = (fallback.data ?? []) as Array<Record<string, unknown>>;
    pageData = [];
  }

  const rows: ClassSectionSummaryDto[] = (
    (pageData ?? []) as Array<Record<string, unknown>>
  ).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    studentCount: Number(row.student_count),
    assignmentCount: Number(row.assignment_count),
    gradingProgress: {
      completed: Number(row.completed_count),
      total: Number(row.grading_total),
      percentage: Number(row.grading_percentage),
    },
  }));

  const summary = records[0];
  const facet = ((facetsResult?.data ?? []) as Array<Record<string, unknown>>)[0];

  // Prefer facet aggregates, then fall back to aggregates returned by the page RPC.
  const total = Number(
    facet?.class_count ?? facet?.all_count ?? summary?.total_count ?? rows.length,
  );
  const studentCount = Number(
    facet?.student_count ??
      summary?.total_student_count ??
      rows.reduce((acc, r) => acc + r.studentCount, 0),
  );
  const assignmentCount = Number(
    facet?.assignment_count ??
      summary?.total_assignment_count ??
      rows.reduce((acc, r) => acc + r.assignmentCount, 0),
  );
  const completedCount = Number(
    facet?.completed_count ??
      summary?.total_completed_count ??
      rows.reduce((acc, r) => acc + r.gradingProgress.completed, 0),
  );
  const gradingTotal = Number(
    facet?.grading_total ??
      summary?.total_grading_total ??
      rows.reduce((acc, r) => acc + r.gradingProgress.total, 0),
  );

  return {
    total,
    rows,
    metrics: {
      classCount: total,
      studentCount,
      assignmentCount,
      completedCount,
      gradingTotal,
      gradingPercentage:
        gradingTotal === 0
          ? 0
          : Math.round((completedCount / gradingTotal) * 100),
    },
    filterCounts: {
      all: Number(facet?.all_count ?? total),
      urgent: Number(facet?.urgent_count ?? 0),
      good: Number(facet?.good_count ?? 0),
      complete: Number(facet?.complete_count ?? 0),
    },
  };
}

/**
 * Tìm classSectionId từ class code.
 * Dùng cho login: user nhập class code → cần resolve ra classSectionId.
 */
export async function findClassSectionIdByCode(
  code: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("class_sections")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "CLASS_SECTION_LOOKUP_FAILED",
      "Không thể tra cứu mã lớp học",
      { cause: error },
    );
  }

  return data?.id ?? null;
}

/**
 * Tìm class code từ classSectionId.
 */
export async function findClassSectionCodeById(
  id: string,
): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("class_sections")
    .select("code")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "CLASS_SECTION_CODE_LOOKUP_FAILED",
      "Không thể tra cứu mã lớp học từ ID",
      { cause: error },
    );
  }

  return data?.code ?? null;
}

