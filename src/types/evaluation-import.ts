export type EvaluationImportPreviewRowDto = {
  rowNumber: number;
  mssv: string;
  fullName?: string;
  studentId?: string;
  score: number | null;
  feedback: string | null;
  status: "valid" | "skipped";
  errors?: Array<{ field: string; message: string }>;
};

export type EvaluationImportPreviewDto = {
  summary: {
    total: number;
    valid: number;
    skipped: number;
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
};

export type GradeImportModalProps = {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  classSectionId: string;
  maxScore: number;
  onSuccess: (result: EvaluationImportResultDto) => void;
};
