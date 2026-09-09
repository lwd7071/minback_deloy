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

export type {
  GradebookStudentColumnDto,
  GradebookAssignmentHeaderDto,
  GradebookCellEvaluationDto,
  GradebookEvaluationMatrixDto,
  GradebookPaginationMetaDto,
  GradebookDto,
} from "@/types/gradebook";

export type ImportPreviewDto = {
  summary: { total: number; valid: number; skipped: number };
  rows: Array<{
    row: number;
    status: "valid" | "skipped";
    student?: { mssv: string; fullName: string; email?: string };
    errors?: Array<{ field: string; message: string }>;
  }>;
};
