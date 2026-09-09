import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradebookQuery } from "@/schemas/frontend-rebuild";
import type {
  GradebookDto,
  GradebookEvaluationMatrixDto,
  GradebookStudentColumnDto,
  GradebookAssignmentHeaderDto,
} from "@/types/gradebook";

/**
 * Truy vấn ma trận bảng điểm cho một lớp học phần (Domain Gradebook).
 * Tách biệt khỏi các nghiệp vụ quản lý lớp để tuân thủ Single Responsibility Principle (SRP).
 */
export async function getGradebookRows(
  supabase: SupabaseClient,
  classSectionId: string,
  query: GradebookQuery,
): Promise<GradebookDto> {
  const studentFrom = (query.studentPage - 1) * query.studentPageSize;
  const assignmentFrom = (query.assignmentPage - 1) * query.assignmentPageSize;

  // Lấy danh sách sinh viên và bài tập trong phạm vi phân trang
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

  if (studentResult.error || assignmentResult.error) {
    throw new Error("GRADEBOOK_LIST_FAILED");
  }

  const studentIds = (studentResult.data ?? []).map((row) => row.id as string);
  const assignmentIds = (assignmentResult.data ?? []).map(
    (row) => row.id as string,
  );

  // Truy vấn ma trận điểm đánh giá giao giữa danh sách sinh viên và bài tập trang hiện tại
  const evaluationResult =
    studentIds.length && assignmentIds.length
      ? await supabase
          .from("evaluations")
          .select("id, student_id, assignment_id, score, status")
          .in("student_id", studentIds)
          .in("assignment_id", assignmentIds)
      : { data: [], error: null };

  if (evaluationResult.error) {
    throw new Error("GRADEBOOK_LIST_FAILED");
  }

  const evaluations: GradebookEvaluationMatrixDto = {};
  for (const row of evaluationResult.data ?? []) {
    const studentId = row.student_id as string;
    evaluations[studentId] ??= {};
    evaluations[studentId][row.assignment_id as string] = {
      id: row.id as string,
      score: row.score === null ? null : Number(row.score),
      status: row.status as "pending" | "graded" | "returned",
    };
  }

  const students: GradebookStudentColumnDto[] = (
    studentResult.data ?? []
  ).map((row) => ({
    id: row.id as string,
    mssv: row.mssv as string,
    fullName: row.full_name as string,
    nickname: row.nickname as string,
  }));

  const assignments: GradebookAssignmentHeaderDto[] = (
    assignmentResult.data ?? []
  ).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    maxScore: Number(row.max_score),
    status: row.status as "published" | "closed",
  }));

  return {
    students,
    assignments,
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
