import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  EvaluationDto,
  EvaluationStatus,
  EvaluationWithStudentDto,
} from "@/types/evaluation";
import type { EvaluationInput } from "@/schemas/evaluation";

type EvaluationWithStudentRow = {
  id: string;
  student_id: string;
  assignment_id: string;
  score: number | string | null;
  feedback: string;
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
  students: {
    id: string;
    mssv: string;
    full_name: string;
    nickname: string;
  } | null;
};

type EvaluationRow = Omit<EvaluationWithStudentRow, "students">;

const EVALUATION_COLUMNS =
  "id, student_id, assignment_id, score, feedback, status, created_at, updated_at";

function toEvaluationDto(row: EvaluationRow): EvaluationDto {
  return {
    id: row.id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    score: row.score === null ? null : Number(row.score),
    feedback: row.feedback,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDto(row: EvaluationWithStudentRow): EvaluationWithStudentDto {
  if (!row.students) throw new Error("EVALUATION_STUDENT_MISSING");
  return {
    id: row.id,
    studentId: row.student_id,
    assignmentId: row.assignment_id,
    score: row.score === null ? null : Number(row.score),
    feedback: row.feedback,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    student: {
      id: row.students.id,
      mssv: row.students.mssv,
      fullName: row.students.full_name,
      nickname: row.students.nickname,
    },
  };
}

export async function listEvaluationsWithStudents(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<EvaluationWithStudentDto[]> {
  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, student_id, assignment_id, score, feedback, status, created_at, updated_at, students!inner(id, mssv, full_name, nickname)",
    )
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("EVALUATION_LIST_FAILED");
  return (data as unknown as EvaluationWithStudentRow[]).map(toDto);
}

export async function findEvaluationByPair(
  supabase: SupabaseClient,
  assignmentId: string,
  studentId: string,
): Promise<EvaluationDto | null> {
  const { data, error } = await supabase
    .from("evaluations")
    .select(EVALUATION_COLUMNS)
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw new Error("EVALUATION_GET_FAILED");
  return data ? toEvaluationDto(data as EvaluationRow) : null;
}

export async function insertEvaluation(
  supabase: SupabaseClient,
  assignmentId: string,
  studentId: string,
  input: EvaluationInput,
): Promise<EvaluationDto> {
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      assignment_id: assignmentId,
      student_id: studentId,
      score: input.score,
      feedback: input.feedback,
      status: input.status,
    })
    .select(EVALUATION_COLUMNS)
    .single();

  if (error) throw new Error("EVALUATION_CREATE_FAILED");
  return toEvaluationDto(data as EvaluationRow);
}

export async function updateEvaluation(
  supabase: SupabaseClient,
  evaluationId: string,
  input: EvaluationInput,
): Promise<EvaluationDto> {
  const { data, error } = await supabase
    .from("evaluations")
    .update({
      score: input.score,
      feedback: input.feedback,
      status: input.status,
    })
    .eq("id", evaluationId)
    .select(EVALUATION_COLUMNS)
    .single();

  if (error) throw new Error("EVALUATION_UPDATE_FAILED");
  return toEvaluationDto(data as EvaluationRow);
}
