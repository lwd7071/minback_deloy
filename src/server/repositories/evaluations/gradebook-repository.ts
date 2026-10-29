import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradebookQuery } from "@/schemas/frontend-rebuild";
import type { AssignmentStatus } from "@/types/assignment";
import type {
  GradebookDto,
  GradebookEvaluationMatrixDto,
  GradebookStudentColumnDto,
  GradebookAssignmentHeaderDto,
} from "@/types/gradebook";
import { calculateGradebookScore } from "@/lib/gradebook";

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
      .select(
        "id, title, max_score, status, gradebook_included, gradebook_weight",
        { count: "exact" },
      )
      .eq("class_section_id", classSectionId)
      .order("assigned_date", { ascending: false })
      .order("id"),
  ]);

  if (studentResult.error || assignmentResult.error) {
    throw new Error("GRADEBOOK_LIST_FAILED");
  }

  const studentIds = (studentResult.data ?? []).map((row) => row.id as string);
  const allAssignments = assignmentResult.data ?? [];
  const pageAssignments = allAssignments.slice(
    assignmentFrom,
    assignmentFrom + query.assignmentPageSize,
  );
  const pageAssignmentIds = new Set(
    pageAssignments.map((assignment) => assignment.id),
  );
  const assignmentIds = allAssignments.map((row) => row.id as string);

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
  const evaluationsByStudent = new Map<
    string,
    Map<
      string,
      { score: number | null; status: "pending" | "graded" | "returned" }
    >
  >();
  for (const row of evaluationResult.data ?? []) {
    const studentId = row.student_id as string;
    const assignmentId = row.assignment_id as string;
    const evaluation = {
      score: row.score === null ? null : Number(row.score),
      status: row.status as "pending" | "graded" | "returned",
    };
    const studentEvaluations = evaluationsByStudent.get(studentId) ?? new Map();
    studentEvaluations.set(assignmentId, evaluation);
    evaluationsByStudent.set(studentId, studentEvaluations);
    if (!pageAssignmentIds.has(assignmentId)) {
      continue;
    }
    evaluations[studentId] ??= {};
    evaluations[studentId][assignmentId] = {
      id: row.id as string,
      ...evaluation,
    };
  }

  const students: GradebookStudentColumnDto[] = (studentResult.data ?? []).map(
    (row) => ({
      id: row.id as string,
      mssv: row.mssv as string,
      fullName: row.full_name as string,
      nickname: row.nickname as string,
    }),
  );

  const assignments: GradebookAssignmentHeaderDto[] = pageAssignments.map(
    (row) => ({
      id: row.id as string,
      title: row.title as string,
      maxScore: Number(row.max_score),
      status: row.status as AssignmentStatus,
      included: Boolean(row.gradebook_included),
      weight:
        row.gradebook_weight === null ? null : Number(row.gradebook_weight),
    }),
  );

  const totals = Object.fromEntries(
    (studentResult.data ?? []).map((student) => {
      const studentEvaluations = evaluationsByStudent.get(student.id as string);
      return [
        student.id as string,
        calculateGradebookScore(
          allAssignments.map((assignment) => {
            const evaluation = studentEvaluations?.get(assignment.id as string);
            return {
              assignmentId: assignment.id as string,
              maxScore: Number(assignment.max_score),
              score: evaluation?.score ?? null,
              status: evaluation?.status ?? "pending",
              included: Boolean(assignment.gradebook_included),
              weight:
                assignment.gradebook_weight === null
                  ? null
                  : Number(assignment.gradebook_weight),
            };
          }),
        ),
      ];
    }),
  );

  return {
    students,
    assignments,
    evaluations,
    totals,
    assignmentsConfig: allAssignments.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      included: Boolean(row.gradebook_included),
      weight:
        row.gradebook_weight === null ? null : Number(row.gradebook_weight),
    })),
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
