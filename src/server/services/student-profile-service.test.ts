import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { calculateProfileProgress } from "./student-profile-service";

describe("calculateProfileProgress", () => {
  it("returns 0/0/0 when the Student has no visible Assignments", () => {
    expect(calculateProfileProgress([])).toEqual({
      completed: 0,
      total: 0,
      percentage: 0,
    });
  });

  it.each([
    {
      name: "does not complete pending Evaluations",
      assignments: [{ evaluation: { status: "pending" as const } }],
      expected: { completed: 0, total: 1, percentage: 0 },
    },
    {
      name: "rounds a mixed visible profile to the nearest integer",
      assignments: [
        { evaluation: { status: "graded" as const } },
        { evaluation: { status: "returned" as const } },
        { evaluation: { status: "pending" as const } },
      ],
      expected: { completed: 2, total: 3, percentage: 67 },
    },
    {
      name: "does not complete an Assignment without an Evaluation",
      assignments: [{ evaluation: null }],
      expected: { completed: 0, total: 1, percentage: 0 },
    },
  ])("$name", ({ assignments, expected }) => {
    expect(calculateProfileProgress(assignments)).toEqual(expected);
  });
});
