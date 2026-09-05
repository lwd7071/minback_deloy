export type StudentResultDto = {
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  score: number | null;
  feedback: string | null;
  status: "returned";
  returnedAt: string;
  updatedAt: string;
};

export type StudentResultsResponseDto = {
  results: StudentResultDto[];
};
