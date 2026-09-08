export type EvaluationStatus = "pending" | "graded" | "returned";

export type EvaluationDto = {
  id: string;
  studentId: string;
  assignmentId: string;
  score: number | null;
  feedback: string;
  status: EvaluationStatus;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationWithStudentDto = EvaluationDto & {
  student: {
    id: string;
    mssv: string;
    fullName: string;
    nickname: string;
  };
};

// ─── Evaluation History ───────────────────────────────────────────────────────

export type EvaluationHistoryRow = {
  id: string;
  evaluation_id: string;
  old_score: number | null;
  old_feedback: string;
  old_status: "pending" | "graded" | "returned";
  changed_at: string;
  changed_by: string; // teacher_id
};

export type EvaluationHistoryDto = {
  id: string;
  evaluationId: string;
  oldScore: number | null;
  oldFeedback: string;
  oldStatus: "pending" | "graded" | "returned";
  changedAt: string;
  changedBy: {
    id: string;
    displayName: string;
  };
};

