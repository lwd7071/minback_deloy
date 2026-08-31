import { classSectionCodeSchema } from "@/schemas/class-section";
import type { EvaluationStatus } from "@/types/evaluation";

export function normalizePublicClassCode(value: string): string {
  return classSectionCodeSchema.parse(value);
}

export function calculateGradingProgress(input: {
  studentCount: number;
  assignmentCount: number;
  completedEvaluationCount: number;
}): { completed: number; total: number; percentage: number } {
  const total = input.studentCount * input.assignmentCount;
  const completed = Math.min(input.completedEvaluationCount, total);
  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function calculateAverageScorePercentage(
  evaluations: Array<{
    score: number | null;
    maxScore: number;
    status: EvaluationStatus;
  }>,
): number | null {
  const completed = evaluations.filter(
    (evaluation) =>
      evaluation.score !== null &&
      (evaluation.status === "graded" || evaluation.status === "returned"),
  );
  if (completed.length === 0) return null;
  return Math.round(
    completed.reduce(
      (sum, evaluation) => sum + evaluation.score! / evaluation.maxScore,
      0,
    ) /
      completed.length /
      0.01,
  );
}
