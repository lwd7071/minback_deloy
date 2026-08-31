import { describe, expect, it } from "vitest";

import { evaluationInputSchema } from "./evaluation";

describe("Evaluation validation", () => {
  it("allows pending without score and graded/returned with a one-decimal score", () => {
    expect(
      evaluationInputSchema.safeParse({
        score: null,
        feedback: "",
        status: "pending",
      }).success,
    ).toBe(true);
    expect(
      evaluationInputSchema.safeParse({
        score: 8.5,
        feedback: "Good",
        status: "graded",
      }).success,
    ).toBe(true);
    expect(
      evaluationInputSchema.safeParse({
        score: 10,
        feedback: "Done",
        status: "returned",
      }).success,
    ).toBe(true);
  });

  it("rejects missing required score, negative/over-precision score and oversized feedback", () => {
    const invalid = [
      { score: null, feedback: "", status: "graded" },
      { score: -0.1, feedback: "", status: "pending" },
      { score: 8.25, feedback: "", status: "graded" },
      { score: 8, feedback: "x".repeat(5_001), status: "returned" },
    ];
    expect(
      invalid.every((input) => !evaluationInputSchema.safeParse(input).success),
    ).toBe(true);
  });
});
