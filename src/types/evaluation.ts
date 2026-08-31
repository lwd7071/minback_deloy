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
