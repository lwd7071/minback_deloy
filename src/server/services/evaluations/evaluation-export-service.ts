import "server-only";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import type { CriterionScore } from "@/lib/evaluation-criteria";
import {
  buildEvaluationExportWorkbook,
  type EvaluationExportStudent,
} from "./templates/evaluation-export-generator";

const PAGE_SIZE = 1000;

type StudentRow = { id: string; mssv: string; full_name: string };
type EvaluationRow = {
  student_id: string;
  score: number | string | null;
  feedback: string | null;
  criteria_scores: unknown;
};

async function loadStudents(
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
  classSectionId: string,
): Promise<StudentRow[]> {
  const students: StudentRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("students")
      .select("id, mssv, full_name")
      .eq("class_section_id", classSectionId)
      .order("mssv", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error || !data) {
      throw new ApiError(
        500,
        API_ERROR_CODES.internal,
        "Không thể xuất danh sách sinh viên",
      );
    }
    students.push(...(data as unknown as StudentRow[]));
    if (data.length < PAGE_SIZE) return students;
  }
}

async function loadEvaluations(
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
  assignmentId: string,
): Promise<EvaluationRow[]> {
  const evaluations: EvaluationRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("student_id, score, feedback, criteria_scores")
      .eq("assignment_id", assignmentId)
      .range(start, start + PAGE_SIZE - 1);
    if (error || !data) {
      throw new ApiError(
        500,
        API_ERROR_CODES.internal,
        "Không thể xuất kết quả bài tập",
      );
    }
    evaluations.push(...(data as unknown as EvaluationRow[]));
    if (data.length < PAGE_SIZE) return evaluations;
  }
}

export async function generateEvaluationExport(
  assignmentId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const { supabase, teacher } = await requireTeacher();
  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }

  const [students, evaluationRows] = await Promise.all([
    loadStudents(supabase, assignment.classSectionId),
    loadEvaluations(supabase, assignmentId),
  ]);
  const evaluationsByStudent = new Map(
    evaluationRows.map((evaluation) => [evaluation.student_id, evaluation]),
  );
  const exportStudents: EvaluationExportStudent[] = students.map((student) => {
    const evaluation = evaluationsByStudent.get(student.id);
    return {
      mssv: student.mssv,
      fullName: student.full_name,
      ...(evaluation
        ? {
            evaluation: {
              score:
                evaluation.score === null ? null : Number(evaluation.score),
              feedback: evaluation.feedback ?? "",
              criteriaScores: Array.isArray(evaluation.criteria_scores)
                ? (evaluation.criteria_scores as CriterionScore[])
                : undefined,
            },
          }
        : {}),
    };
  });

  return buildEvaluationExportWorkbook(
    assignment.title,
    assignment.criteria ?? [],
    exportStudents,
  );
}
