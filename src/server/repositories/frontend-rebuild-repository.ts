import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { GradebookQuery } from "@/schemas/frontend-rebuild";
import type { ClassSectionListQuery } from "@/schemas/class-section";
import type {
  ClassSectionSummaryDto,
  GradebookDto,
  PublicClassSectionDto,
} from "@/types/frontend-rebuild";

export async function findPublicClassSectionByCode(
  code: string,
): Promise<PublicClassSectionDto | null> {
  const { data, error } = await createAdminClient()
    .from("class_sections")
    .select("code, name")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error("PUBLIC_CLASS_SECTION_LOOKUP_FAILED");
  return data as PublicClassSectionDto | null;
}

export async function consumePublicLookupRateLimit(
  keyHash: string,
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc(
    "consume_public_lookup_rate_limit",
    { p_key_hash: keyHash },
  );
  if (error) throw new Error("PUBLIC_LOOKUP_RATE_LIMIT_FAILED");
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
}> {
  const fetchPage = async (offset: number, limit: number) =>
    supabase.rpc("list_class_section_summaries", {
      p_teacher_id: teacherId,
      p_offset: offset,
      p_limit: limit,
      p_search: query.search || null,
    });
  const initialPage = await fetchPage(
    (query.page - 1) * query.pageSize,
    query.pageSize,
  );
  if (initialPage.error) throw new Error("CLASS_SECTION_SUMMARY_LIST_FAILED");
  let pageData = initialPage.data;
  let records = (pageData ?? []) as Array<Record<string, unknown>>;
  if (records.length === 0 && query.page > 1) {
    const fallback = await fetchPage(0, 1);
    if (fallback.error) throw new Error("CLASS_SECTION_SUMMARY_LIST_FAILED");
    records = (fallback.data ?? []) as Array<Record<string, unknown>>;
    pageData = [];
  }
  const summary = records[0];
  const total = Number(summary?.total_count ?? 0);
  const completedCount = Number(summary?.total_completed_count ?? 0);
  const gradingTotal = Number(summary?.total_grading_total ?? 0);
  return {
    total,
    rows: ((pageData ?? []) as Array<Record<string, unknown>>).map((row) => ({
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
    })),
    metrics: {
      classCount: total,
      studentCount: Number(summary?.total_student_count ?? 0),
      assignmentCount: Number(summary?.total_assignment_count ?? 0),
      completedCount,
      gradingTotal,
      gradingPercentage:
        gradingTotal === 0
          ? 0
          : Math.round((completedCount / gradingTotal) * 100),
    },
  };
}

export async function getGradebookRows(
  supabase: SupabaseClient,
  classSectionId: string,
  query: GradebookQuery,
): Promise<GradebookDto> {
  const studentFrom = (query.studentPage - 1) * query.studentPageSize;
  const assignmentFrom = (query.assignmentPage - 1) * query.assignmentPageSize;
  const [studentResult, assignmentResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, mssv, full_name, nickname", { count: "exact" })
      .eq("class_section_id", classSectionId)
      .order("mssv")
      .range(studentFrom, studentFrom + query.studentPageSize - 1),
    supabase
      .from("assignments")
      .select("id, title, max_score, status", { count: "exact" })
      .eq("class_section_id", classSectionId)
      .in("status", ["published", "closed"])
      .order("assigned_date", { ascending: false })
      .range(assignmentFrom, assignmentFrom + query.assignmentPageSize - 1),
  ]);
  if (studentResult.error || assignmentResult.error)
    throw new Error("GRADEBOOK_LIST_FAILED");
  const studentIds = (studentResult.data ?? []).map((row) => row.id as string);
  const assignmentIds = (assignmentResult.data ?? []).map(
    (row) => row.id as string,
  );
  const evaluationResult =
    studentIds.length && assignmentIds.length
      ? await supabase
          .from("evaluations")
          .select("id, student_id, assignment_id, score, status")
          .in("student_id", studentIds)
          .in("assignment_id", assignmentIds)
      : { data: [], error: null };
  if (evaluationResult.error) throw new Error("GRADEBOOK_LIST_FAILED");
  const evaluations: GradebookDto["evaluations"] = {};
  for (const row of evaluationResult.data ?? []) {
    const studentId = row.student_id as string;
    evaluations[studentId] ??= {};
    evaluations[studentId][row.assignment_id as string] = {
      id: row.id as string,
      score: row.score === null ? null : Number(row.score),
      status: row.status as "pending" | "graded" | "returned",
    };
  }
  return {
    students: (studentResult.data ?? []).map((row) => ({
      id: row.id as string,
      mssv: row.mssv as string,
      fullName: row.full_name as string,
      nickname: row.nickname as string,
    })),
    assignments: (assignmentResult.data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      maxScore: Number(row.max_score),
      status: row.status as "published" | "closed",
    })),
    evaluations,
    meta: {
      students: {
        page: query.studentPage,
        pageSize: query.studentPageSize,
        total: studentResult.count ?? 0,
      },
      assignments: {
        page: query.assignmentPage,
        pageSize: query.assignmentPageSize,
        total: assignmentResult.count ?? 0,
      },
    },
  };
}
