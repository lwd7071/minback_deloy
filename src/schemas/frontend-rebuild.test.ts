import { describe, expect, it } from "vitest";
import { gradebookConfigSchema } from "./frontend-rebuild";

const first = "f3000000-0000-0000-0000-000000000001";
const second = "f3000000-0000-0000-0000-000000000002";

describe("gradebookConfigSchema", () => {
  it("accepts enabled weights totaling 100 and excluded assignments", () => {
    expect(
      gradebookConfigSchema.safeParse({
        assignments: [
          { assignmentId: first, included: true, weight: 60 },
          { assignmentId: second, included: true, weight: 40 },
        ],
      }).success,
    ).toBe(true);
    expect(
      gradebookConfigSchema.safeParse({
        assignments: [{ assignmentId: first, included: false, weight: null }],
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate assignments, missing weights, and an invalid total", () => {
    expect(
      gradebookConfigSchema.safeParse({
        assignments: [
          { assignmentId: first, included: true, weight: 50 },
          { assignmentId: first, included: true, weight: 50 },
        ],
      }).success,
    ).toBe(false);
    expect(
      gradebookConfigSchema.safeParse({
        assignments: [{ assignmentId: first, included: true, weight: null }],
      }).success,
    ).toBe(false);
    expect(
      gradebookConfigSchema.safeParse({
        assignments: [{ assignmentId: first, included: true, weight: 80 }],
      }).success,
    ).toBe(false);
  });
});
