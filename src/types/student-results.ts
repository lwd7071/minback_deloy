import type { CriterionScore } from "@/lib/evaluation-criteria";
import type { GradebookScoreSummary } from "@/lib/gradebook";

export type StudentResultDto = {
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  score: number | null;
  feedback: string | null;
  status: "returned";
  includedInFinal: boolean;
  weight: number | null;
  criteriaScores?: CriterionScore[];
  returnedAt: string;
  updatedAt: string;
};

export type StudentResultsResponseDto = {
  results: StudentResultDto[];
  total: GradebookScoreSummary;
};
