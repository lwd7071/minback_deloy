import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { listActiveAttachmentsForAssignments } from "@/server/repositories/file-asset-repository";
import { listStudentSubmissionSummaries } from "@/server/repositories/submission-repository";
import type { AssignmentDto, AssignmentStatus } from "@/types/assignment";
import type { EvaluationDto, EvaluationStatus } from "@/types/evaluation";
import type { StudentProfileAssignmentDto } from "@/types/student-profile";
import type { SubmissionSummaryDto } from "@/types/submission";

type StudentRow = {
  id: string;
  class_section_id: string;
  mssv: string;
  full_name: string;
  nickname: string;
};

type ClassSectionRow = {
  id: string;
  code: string;
  name: string;
};

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

type EvaluationRow = {
  id: string;
  student_id: string;
  assignment_id: string;
  score: number | string | null;
  feedback: string;
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
};

export type StudentProfileData = {
  student: StudentRow;
  classSection: ClassSectionRow;
  assignments: StudentProfileAssignmentDto[];
};

function toAssignmentDto(row: AssignmentRow): AssignmentDto {
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

export async function findStudentProfileData(
  studentId: string,
  classSectionId: string,
): Promise<StudentProfileData | null> {
  const supabase = createAdminClient();

  // Đợt 1: Chạy song song 3 truy vấn độc lập (Student, Lớp học phần, và Danh sách bài tập)
  const [studentResult, classSectionResult, assignmentResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, class_section_id, mssv, full_name, nickname")
      .eq("id", studentId)
      .eq("class_section_id", classSectionId)
      .maybeSingle(),
    supabase
      .from("class_sections")
      .select("id, code, name")
      .eq("id", classSectionId)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select(
        "id, class_section_id, title, description, assigned_date, due_date, status, max_score, created_at, updated_at",
      )
      .eq("class_section_id", classSectionId)
      .in("status", ["published", "closed"])
      .order("assigned_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (studentResult.error) throw new Error("STUDENT_PROFILE_STUDENT_FAILED");
  if (classSectionResult.error)
    throw new Error("STUDENT_PROFILE_CLASS_SECTION_FAILED");
  if (assignmentResult.error)
    throw new Error("STUDENT_PROFILE_ASSIGNMENTS_FAILED");

  if (!studentResult.data || !classSectionResult.data) return null;

  const assignments = (assignmentResult.data as AssignmentRow[]).map(toAssignmentDto);
  if (assignments.length === 0) {
    return {
      student: studentResult.data as StudentRow,
      classSection: classSectionResult.data as ClassSectionRow,
      assignments: [],
    };
  }

  const assignmentIds = assignments.map((assignment) => assignment.id);

  // Đợt 2: Chạy song song 3 truy vấn phụ thuộc vào assignmentIds (Điểm số, File đính kèm, Bài nộp)
  const [evaluationResult, attachments, summaries] = await Promise.all([
    supabase
      .from("evaluations")
      .select(
        "id, student_id, assignment_id, score, feedback, status, created_at, updated_at",
      )
      .eq("student_id", studentId)
      .in("assignment_id", assignmentIds),
    listActiveAttachmentsForAssignments(assignmentIds),
    listStudentSubmissionSummaries(studentId, assignmentIds),
  ]);

  if (evaluationResult.error) throw new Error("STUDENT_PROFILE_EVALUATIONS_FAILED");

  const evaluationsByAssignment = new Map(
    (evaluationResult.data as EvaluationRow[]).map((row) => {
      const evaluation = toEvaluationDto(row);
      return [evaluation.assignmentId, evaluation];
    }),
  );
  const attachmentsByAssignment = new Map<
    string,
    StudentProfileAssignmentDto["attachments"]
  >();
  for (const attachment of attachments) {
    const current = attachmentsByAssignment.get(attachment.assignment_id) ?? [];
    current.push({
      id: attachment.id,
      originalName: attachment.original_name,
      bytes: Number(attachment.bytes),
      format: attachment.format,
      uploadedAt: attachment.created_at,
      downloadUrl: `/api/v1/student/assignments/${attachment.assignment_id}/attachments/${attachment.id}/download`,
    });
    attachmentsByAssignment.set(attachment.assignment_id, current);
  }
  const summariesByAssignment = new Map<string, SubmissionSummaryDto>(
    summaries.map((summary) => [
      summary.assignmentId,
      {
        attemptCount: summary.attemptCount,
        latestAttempt: summary.latestAttempt
          ? {
              ...summary.latestAttempt,
              files: summary.latestAttempt.files.map((file) => ({
                ...file,
                uploadedAt: file.createdAt,
                downloadUrl: `/api/v1/student/assignments/${summary.assignmentId}/submissions/files/${file.id}/download`,
              })),
            }
          : null,
      },
    ]),
  );

  return {
    student: studentResult.data as StudentRow,
    classSection: classSectionResult.data as ClassSectionRow,
    assignments: assignments.map((assignment) => ({
      ...assignment,
      evaluation: evaluationsByAssignment.get(assignment.id) ?? null,
      attachments: attachmentsByAssignment.get(assignment.id) ?? [],
      submission: summariesByAssignment.get(assignment.id) ?? {
        latestAttempt: null,
        attemptCount: 0,
      },
    })),
  };
}
