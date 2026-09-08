import type { AssignmentStatus } from "@/types/assignment";
import type { EvaluationStatus } from "@/types/evaluation";

export type PublicClassSectionDto = { code: string; name: string };

export type ClassSectionSummaryDto = {
  id: string;
  code: string;
  name: string;
  studentCount: number;
  assignmentCount: number;
  gradingProgress: { completed: number; total: number; percentage: number };
};

export type ClassSummaryFilterCounts = {
  all: number;
  urgent: number;
  good: number;
  complete: number;
};

export type GradebookDto = {
  students: Array<{
    id: string;
    mssv: string;
    fullName: string;
    nickname: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    maxScore: number;
    status: AssignmentStatus;
  }>;
  evaluations: Record<
    string,
    Record<
      string,
      { id: string; score: number | null; status: EvaluationStatus }
    >
  >;
  meta: {
    students: { page: number; pageSize: number; total: number };
    assignments: { page: number; pageSize: number; total: number };
  };
};

export type ImportPreviewDto = {
  summary: { total: number; valid: number; skipped: number };
  rows: Array<{
    row: number;
    status: "valid" | "skipped";
    student?: { mssv: string; fullName: string; email?: string };
    errors?: Array<{ field: string; message: string }>;
  }>;
};
