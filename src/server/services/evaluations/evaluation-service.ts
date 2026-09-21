import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { evaluationInputSchema } from "@/schemas/evaluation";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import {
  findEvaluationByPair,
  insertEvaluation,
  listEvaluationsWithStudents,
  updateEvaluation,
} from "@/server/repositories/evaluations/evaluation-repository";
import { findStudentById } from "@/server/repositories/students/student-repository";
import { createEvaluationNotification } from "@/server/services/notifications/notification-service";
import { deferBackgroundTask } from "@/server/lib/async-task-runner";
import { withServerTiming } from "@/server/lib/server-timing";
import type {
  EvaluationDto,
  EvaluationWithStudentDto,
  TeacherGradingSnapshotDto,
} from "@/types/evaluation";
import type { AssignmentStatus } from "@/types/assignment";

export interface TeacherEvaluationContext {
  teacherId: string;
  supabase: SupabaseClient;
}

type SnapshotAssignment = {
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
type SnapshotStudent = {
  id: string;
  class_section_id: string;
  mssv: string;
  full_name: string;
  email: string | null;
  nickname: string;
  must_change_nickname: boolean;
  must_change_pin: boolean;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};
type SnapshotEvaluation = {
  id: string;
  student_id: string;
  assignment_id: string;
  score: number | string | null;
  feedback: string;
  status: "pending" | "graded" | "returned";
  created_at: string;
  updated_at: string;
  student: Pick<SnapshotStudent, "id" | "mssv" | "full_name" | "nickname">;
};
type SnapshotRaw = {
  snapshot_version?: unknown;
  assignment?: SnapshotAssignment | null;
  students?: SnapshotStudent[];
  evaluations?: SnapshotEvaluation[];
  student_meta?: Record<string, unknown>;
  grading_counts?: Record<string, unknown>;
};

function unexpected(error: unknown): never {
  if (error instanceof ApiError) throw error;
  throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
}

export async function listTeacherEvaluations(
  assignmentId: string,
  context: TeacherEvaluationContext,
): Promise<EvaluationWithStudentDto[]> {
  const { supabase, teacherId } = context;
  try {
    const assignment = await findAssignmentById(assignmentId, teacherId);
    if (!assignment) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    return await listEvaluationsWithStudents(supabase, assignmentId);
  } catch (error) {
    return unexpected(error);
  }
}

export async function getTeacherGradingSnapshot(
  assignmentId: string,
  context: TeacherEvaluationContext,
  query: { page: number; pageSize: number; search?: string },
): Promise<TeacherGradingSnapshotDto> {
  const { data, error } = await withServerTiming(
    "/admin/classes/[id]/assignments/[aid]/grade",
    () =>
      context.supabase.rpc("get_teacher_grading_snapshot", {
        p_teacher_id: context.teacherId,
        p_assignment_id: assignmentId,
        p_page: query.page,
        p_page_size: query.pageSize,
        p_search: query.search || null,
      }),
    (result) => {
      const snapshot = result.data as { students?: unknown[] } | null;
      return snapshot?.students?.length;
    },
  );
  if (error || !data) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy bảng điểm",
    );
  }
  const raw = data as unknown as SnapshotRaw;
  const assignment = raw.assignment;
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }
  return {
    snapshotVersion: String(raw.snapshot_version ?? ""),
    assignment: {
      id: assignment.id,
      classSectionId: assignment.class_section_id,
      title: assignment.title,
      description: assignment.description,
      assignedDate: assignment.assigned_date,
      dueDate: assignment.due_date,
      status: assignment.status,
      maxScore: Number(assignment.max_score),
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    },
    students: (raw.students ?? []).map((student) => ({
      id: student.id,
      classSectionId: student.class_section_id,
      mssv: student.mssv,
      fullName: student.full_name,
      email: student.email,
      nickname: student.nickname,
      mustChangeNickname: student.must_change_nickname,
      mustChangePin: student.must_change_pin,
      lockedUntil: student.locked_until,
      createdAt: student.created_at,
      updatedAt: student.updated_at,
    })),
    studentMeta: {
      page: Number(raw.student_meta?.page ?? query.page),
      pageSize: Number(raw.student_meta?.page_size ?? query.pageSize),
      total: Number(raw.student_meta?.total ?? 0),
    },
    evaluations: (raw.evaluations ?? []).map((evaluation) => ({
      id: evaluation.id,
      studentId: evaluation.student_id,
      assignmentId: evaluation.assignment_id,
      score: evaluation.score === null ? null : Number(evaluation.score),
      feedback: evaluation.feedback,
      status: evaluation.status,
      createdAt: evaluation.created_at,
      updatedAt: evaluation.updated_at,
      student: {
        id: evaluation.student.id,
        mssv: evaluation.student.mssv,
        fullName: evaluation.student.full_name,
        nickname: evaluation.student.nickname,
      },
    })),
    gradingCounts: {
      totalStudents: Number(raw.grading_counts?.total_students ?? 0),
      gradedCount: Number(raw.grading_counts?.graded_count ?? 0),
      returnedCount: Number(raw.grading_counts?.returned_count ?? 0),
      evaluatedCount: Number(raw.grading_counts?.evaluated_count ?? 0),
      missingCount: Number(raw.grading_counts?.missing_count ?? 0),
    },
  };
}

export async function upsertTeacherEvaluation(
  assignmentId: string,
  studentId: string,
  input: unknown,
  context: TeacherEvaluationContext,
): Promise<EvaluationDto> {
  const { supabase, teacherId } = context;
  try {
    const assignment = await findAssignmentById(assignmentId, teacherId);
    if (!assignment) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy bài tập",
      );
    }
    const student = await findStudentById(studentId, assignment.classSectionId);
    if (!student) {
      throw new ApiError(
        404,
        API_ERROR_CODES.notFound,
        "Không tìm thấy sinh viên",
      );
    }

    const parsed = evaluationInputSchema.safeParse(input);
    if (
      !parsed.success ||
      (parsed.data.score !== null && parsed.data.score > assignment.maxScore)
    ) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Dữ liệu đánh giá không hợp lệ",
      );
    }

    const current = await findEvaluationByPair(
      supabase,
      assignmentId,
      studentId,
    );
    if (
      current &&
      current.score === parsed.data.score &&
      current.feedback === parsed.data.feedback &&
      current.status === parsed.data.status
    ) {
      return current;
    }

    const saved = current
      ? await updateEvaluation(supabase, current.id, parsed.data)
      : await insertEvaluation(supabase, assignmentId, studentId, parsed.data);

    deferBackgroundTask(async () => {
      try {
        await createEvaluationNotification({
          studentId,
          evaluationId: saved.id,
          type: current ? "evaluation_updated" : "evaluation_created",
          assignmentTitle: assignment.title,
        });
      } catch {
        // Evaluation/history are already committed; notification delivery is isolated.
      }
    });

    return saved;
  } catch (error) {
    return unexpected(error);
  }
}
