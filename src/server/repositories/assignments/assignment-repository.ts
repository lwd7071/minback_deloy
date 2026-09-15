import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { RepositoryError } from "@/lib/api/errors";
import type {
  AssignmentCreateInput,
  AssignmentUpdateInput,
} from "@/schemas/assignment";
import type {
  AssignmentDto,
  AssignmentStatus,
  TeacherAssignmentSummaryDto,
} from "@/types/assignment";

type AssignmentRow = {
  id: string;
  class_section_id: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  status: AssignmentStatus;
  max_score: number | string;
  created_at: string;
  updated_at: string;
};

const ASSIGNMENT_COLUMNS =
  "id, class_section_id, title, description, assigned_date, due_date, status, max_score, created_at, updated_at";

function toDto(row: AssignmentRow): AssignmentDto {
  return {
    id: row.id,
    classSectionId: row.class_section_id,
    title: row.title,
    description: row.description,
    assignedDate: row.assigned_date,
    dueDate: row.due_date,
    status: row.status,
    maxScore: Number(row.max_score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type StudentAssignmentContext = {
  id: string;
  class_section_id: string;
  status: "draft" | "published" | "closed";
  due_date: string;
};

/**
 * Tìm ngữ cảnh bài tập cho học sinh kiểm tra điều kiện nộp bài/xem bài.
 */
export async function findStudentAssignmentContext(
  assignmentId: string,
  classSectionId: string,
): Promise<StudentAssignmentContext | null> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .select("id, class_section_id, status, due_date")
    .eq("id", assignmentId)
    .eq("class_section_id", classSectionId)
    .maybeSingle();
  if (error) {
    throw new RepositoryError(
      "SUBMISSION_ASSIGNMENT_LOOKUP_FAILED",
      "Không thể tra cứu thông tin bài tập",
      { cause: error },
    );
  }
  return data as StudentAssignmentContext | null;
}

export async function listAssignmentsByClassSection(
  classSectionId: string,
): Promise<AssignmentDto[]> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("class_section_id", classSectionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_LIST_FAILED",
      "Không thể lấy danh sách bài tập",
      { cause: error },
    );
  }
  return (data as AssignmentRow[]).map(toDto);
}

export async function listTeacherAssignmentSummaries(
  classSectionId: string,
): Promise<TeacherAssignmentSummaryDto[]> {
  const supabase = createAdminClient();
  const assignments = await listAssignmentsByClassSection(classSectionId);
  if (!assignments.length) return [];

  const [{ count: totalStudents, error: studentsError }, { data, error }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("class_section_id", classSectionId),
      supabase
        .from("evaluations")
        .select("assignment_id, status")
        .in(
          "assignment_id",
          assignments.map((assignment) => assignment.id),
        ),
    ]);

  if (studentsError) {
    throw new RepositoryError(
      "ASSIGNMENT_STUDENT_COUNT_FAILED",
      "Không thể đếm sinh viên trong lớp",
      { cause: studentsError },
    );
  }
  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_EVALUATION_SUMMARY_FAILED",
      "Không thể tổng hợp tiến độ chấm",
      { cause: error },
    );
  }

  const summaryByAssignment = new Map<
    string,
    { gradedCount: number; returnedCount: number }
  >();
  for (const row of data ?? []) {
    const current = summaryByAssignment.get(row.assignment_id) ?? {
      gradedCount: 0,
      returnedCount: 0,
    };
    if (row.status === "graded") current.gradedCount += 1;
    if (row.status === "returned") current.returnedCount += 1;
    summaryByAssignment.set(row.assignment_id, current);
  }

  const total = totalStudents ?? 0;
  return assignments.map((assignment) => {
    const current = summaryByAssignment.get(assignment.id) ?? {
      gradedCount: 0,
      returnedCount: 0,
    };
    const evaluatedCount = current.gradedCount + current.returnedCount;
    const percentage =
      total > 0 ? Math.round((evaluatedCount / total) * 100) : 0;
    return {
      ...assignment,
      gradingSummary: {
        totalStudents: total,
        ...current,
        evaluatedCount,
        percentage,
        state:
          total === 0
            ? ("empty" as const)
            : evaluatedCount === total
              ? ("complete" as const)
              : ("incomplete" as const),
      },
    };
  });
}

export async function createAssignment(
  classSectionId: string,
  input: AssignmentCreateInput,
): Promise<AssignmentDto> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .insert({
      class_section_id: classSectionId,
      title: input.title,
      description: input.description,
      assigned_date: input.assignedDate,
      due_date: input.dueDate,
      status: input.status,
      max_score: input.maxScore,
    })
    .select(ASSIGNMENT_COLUMNS)
    .single();

  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_CREATE_FAILED",
      "Không thể tạo bài tập",
      { cause: error },
    );
  }
  return toDto(data as AssignmentRow);
}

export async function findAssignmentById(
  assignmentId: string,
  teacherId: string,
): Promise<AssignmentDto | null> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .select(`${ASSIGNMENT_COLUMNS}, class_sections!inner(teacher_id)`)
    .eq("id", assignmentId)
    .eq("class_sections.teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_GET_FAILED",
      "Không thể lấy thông tin bài tập",
      { cause: error },
    );
  }
  return data ? toDto(data as AssignmentRow) : null;
}

export async function updateAssignment(
  assignmentId: string,
  input: AssignmentUpdateInput,
): Promise<AssignmentDto> {
  const updates: Record<string, string | number> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.assignedDate !== undefined)
    updates.assigned_date = input.assignedDate;
  if (input.dueDate !== undefined) updates.due_date = input.dueDate;
  if (input.status !== undefined) updates.status = input.status;
  if (input.maxScore !== undefined) updates.max_score = input.maxScore;

  const { data, error } = await createAdminClient()
    .from("assignments")
    .update(updates)
    .eq("id", assignmentId)
    .select(ASSIGNMENT_COLUMNS)
    .single();

  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_UPDATE_FAILED",
      "Không thể cập nhật bài tập",
      { cause: error },
    );
  }
  return toDto(data as AssignmentRow);
}

export async function hasEvaluations(assignmentId: string): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("evaluations")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId);

  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_EVALUATION_CHECK_FAILED",
      "Không thể kiểm tra đánh giá bài tập",
      { cause: error },
    );
  }
  return (count ?? 0) > 0;
}

export async function deleteDraftAssignment(
  assignmentId: string,
): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error?.code === "23503") return false;
  if (error) {
    throw new RepositoryError(
      "ASSIGNMENT_DELETE_FAILED",
      "Không thể xóa bài tập",
      { cause: error },
    );
  }
  return true;
}
