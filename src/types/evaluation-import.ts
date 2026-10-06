import type { Criterion, CriterionScore } from "@/lib/evaluation-criteria";

export type EvaluationImportPreviewRowDto = {
  rowNumber: number;
  mssv: string;
  fullName?: string;
  studentId?: string;
  score: number | null;
  feedback: string | null;
  // Điểm từng tiêu chí (chỉ có khi file dùng cột (xx%))
  criteriaScores?: CriterionScore[];
  status: "valid" | "invalid" | "skipped";
  action?: "create" | "update" | "unchanged";
  warnings?: Array<{ field: string; message: string }>;
  errors?: Array<{ field: string; message: string }>;
};

export type EvaluationImportPreviewDto = {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
    create?: number;
    update?: number;
    unchanged?: number;
  };
  // Tiêu chí nhận diện từ file (rỗng = chế độ 1 cột điểm)
  criteria?: Criterion[];
  // Cảnh báo cấp file (ghi đè kết quả cũ, đổi tiêu chí...)
  warnings?: Array<{ field: string; message: string }>;
  rows: EvaluationImportPreviewRowDto[];
};

export type EvaluationImportResultDto = {
  count: number;
  mode: "save_draft" | "publish";
  updatedEvaluations: Array<{
    studentId: string;
    score: number | null;
    feedback: string | null;
    status: "graded" | "returned";
    criteriaScores?: CriterionScore[];
  }>;
  snapshotVersion?: string;
  gradingCounts?: {
    totalStudents: number;
    gradedCount: number;
    returnedCount: number;
    evaluatedCount: number;
    missingCount: number;
  };
  summary?: {
    rows: number;
    created: number;
    updated: number;
    unchanged: number;
    notifications: { sent: number; failed: number };
    emails: { sent: number; failed: number };
  };
};

export type GradeImportModalProps = {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  classSectionId: string;
  maxScore: number;
  onSuccess: (result: EvaluationImportResultDto) => void;
};
