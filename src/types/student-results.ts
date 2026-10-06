import type { CriterionScore } from "@/lib/evaluation-criteria";

export type StudentResultDto = {
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  score: number | null;
  feedback: string | null;
  status: "returned";
  criteriaScores?: CriterionScore[];
  returnedAt: string;
  updatedAt: string;
};

export type StudentResultsResponseDto = {
  results: StudentResultDto[];
};
