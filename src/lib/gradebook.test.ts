import { describe, expect, it } from "vitest";
import { calculateGradebookScore } from "./gradebook";

describe("calculateGradebookScore", () => {
  it("normalizes different assignment scales before applying weights", () => {
    expect(
      calculateGradebookScore([
        {
          assignmentId: "project",
          maxScore: 10,
          score: 8,
          status: "returned",
          included: true,
          weight: 60,
        },
        {
          assignmentId: "exam",
          maxScore: 100,
          score: 45,
          status: "returned",
          included: true,
          weight: 40,
        },
      ]),
    ).toMatchObject({ score: 6.6, status: "final" });
  });

  it("normalizes provisional totals over only returned included assignments", () => {
    expect(
      calculateGradebookScore([
        {
          assignmentId: "project",
          maxScore: 10,
          score: 8,
          status: "returned",
          included: true,
          weight: 60,
        },
        {
          assignmentId: "exam",
          maxScore: 10,
          score: 2,
          status: "graded",
          included: true,
          weight: 40,
        },
        {
          assignmentId: "practice",
          maxScore: 10,
          score: 0,
          status: "returned",
          included: false,
          weight: null,
        },
      ]),
    ).toMatchObject({
      score: 8,
      status: "temporary",
      publishedCount: 1,
      includedCount: 2,
    });
  });

  it("returns unavailable when no included score is published or weights are invalid", () => {
    const inputs = [
      {
        assignmentId: "project",
        maxScore: 10,
        score: null,
        status: "graded" as const,
        included: true,
        weight: 80,
      },
    ];
    expect(calculateGradebookScore(inputs).score).toBeNull();
    expect(
      calculateGradebookScore([
        { ...inputs[0], score: 8, status: "returned", weight: 80 },
      ]).status,
    ).toBe("unavailable");
  });

  it("rounds the final score to one decimal place", () => {
    expect(
      calculateGradebookScore([
        {
          assignmentId: "project",
          maxScore: 100,
          score: 85.5,
          status: "returned",
          included: true,
          weight: 100,
        },
      ]).score,
    ).toBe(8.6);
  });
});
