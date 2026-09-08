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
import type {
  EvaluationDto,
  EvaluationWithStudentDto,
} from "@/types/evaluation";

export interface TeacherEvaluationContext {
  teacherId: string;
  supabase: SupabaseClient;
}

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

    return saved;
  } catch (error) {
    return unexpected(error);
  }
}
