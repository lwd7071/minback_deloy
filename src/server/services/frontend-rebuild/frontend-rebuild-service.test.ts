import { describe, expect, it } from "vitest";

import {
  calculateAverageScorePercentage,
  calculateGradingProgress,
  normalizePublicClassCode,
} from "./frontend-rebuild-service";

describe("normalizePublicClassCode", () => {
  it("normalizes a shareable class code without exposing another identifier", () => {
    expect(normalizePublicClassCode(" web101_01 ")).toBe("WEB101_01");
  });
});

describe("calculateGradingProgress", () => {
  it("counts graded and returned evaluation cells over the visible matrix", () => {
    expect(
      calculateGradingProgress({
        studentCount: 2,
        assignmentCount: 2,
        completedEvaluationCount: 3,
      }),
    ).toEqual({ completed: 3, total: 4, percentage: 75 });
  });
});

describe("calculateAverageScorePercentage", () => {
  it("normalizes scores with different maximums and ignores pending rows", () => {
    expect(
      calculateAverageScorePercentage([
        { score: 8, maxScore: 10, status: "graded" },
        { score: 15, maxScore: 20, status: "returned" },
        { score: null, maxScore: 10, status: "pending" },
      ]),
    ).toBe(78);
  });

  it("returns null when there is no completed score", () => {
    expect(
      calculateAverageScorePercentage([
        { score: null, maxScore: 10, status: "pending" },
      ]),
    ).toBeNull();
  });
});
