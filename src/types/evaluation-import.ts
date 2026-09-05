export type EvaluationImportPreviewRowDto = {
  rowNumber: number;
  mssv: string;
  fullName?: string;
  studentId?: string;
  score: number | null;
  feedback: string | null;
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
  }>;
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
