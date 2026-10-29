export type GradebookScoreInput = {
  assignmentId: string;
  maxScore: number;
  score: number | null;
  status: "pending" | "graded" | "returned";
  included: boolean;
  weight: number | null;
};

export type GradebookScoreSummary = {
  score: number | null;
  status: "temporary" | "final" | "unavailable";
  publishedCount: number;
  includedCount: number;
};

export function calculateGradebookScore(
  inputs: GradebookScoreInput[],
): GradebookScoreSummary {
  const included = inputs.filter((item) => item.included);
  const published = included.filter(
    (item) => item.status === "returned" && item.score !== null,
  );
  const publishedWeight = published.reduce(
    (sum, item) => sum + (item.weight ?? 0),
    0,
  );
  const totalWeight = included.reduce(
    (sum, item) => sum + (item.weight ?? 0),
    0,
  );

  if (publishedWeight === 0 || Math.abs(totalWeight - 100) > 0.01) {
    return {
      score: null,
      status: "unavailable",
      publishedCount: published.length,
      includedCount: included.length,
    };
  }

  const weightedScore = published.reduce(
    (sum, item) =>
      sum + ((item.score ?? 0) / item.maxScore) * (item.weight ?? 0),
    0,
  );
  const score = Math.round((weightedScore / publishedWeight) * 100) / 10;

  return {
    score,
    status: published.length === included.length ? "final" : "temporary",
    publishedCount: published.length,
    includedCount: included.length,
  };
}
