import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { evaluationInputSchema } from "@/schemas/evaluation";
import { findAssignmentById } from "@/server/repositories/assignment-repository";
import {
  findEvaluationByPair,
  insertEvaluation,
  listEvaluationsWithStudents,
  updateEvaluation,
} from "@/server/repositories/evaluation-repository";
import { findStudentById } from "@/server/repositories/student-repository";
import { createEvaluationNotification } from "@/server/services/notification-service";
import type {
  EvaluationDto,
  EvaluationWithStudentDto,
} from "@/types/evaluation";

function unexpected(error: unknown): never {
  if (error instanceof Error && error.message.startsWith("EVALUATION_")) {
    throw new ApiError(500, API_ERROR_CODES.internal, "Đã xảy ra lỗi hệ thống");
  }
  throw error;
}

export async function listTeacherEvaluations(
  assignmentId: string,
): Promise<EvaluationWithStudentDto[]> {
  const { supabase, teacher } = await requireTeacher();
  try {
    const assignment = await findAssignmentById(assignmentId, teacher.id);
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
): Promise<EvaluationDto> {
  const { supabase, teacher } = await requireTeacher();
  try {
    const assignment = await findAssignmentById(assignmentId, teacher.id);
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
