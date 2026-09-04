import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  calculateProfileProgress,
  calculateSubmissionProgress,
} from "./student-profile-service";
import { isSubmissionLate } from "./submission-service";

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
        { evaluation: { status: "returned" as const } },
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

describe("calculateSubmissionProgress", () => {
  it("counts an Assignment once when it has any finalized latest attempt", () => {
    expect(
      calculateSubmissionProgress([
        { submission: { latestAttempt: null } },
        { submission: { latestAttempt: { id: "attempt-1" } } },
        { submission: { latestAttempt: { id: "attempt-2" } } },
      ]),
    ).toEqual({ completed: 2, total: 3, percentage: 67 });
  });
});

describe("isSubmissionLate", () => {
  it("uses the end of the due date in Asia/Ho_Chi_Minh", () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(new Date("2026-08-31T16:59:59.999Z").getTime());
    expect(isSubmissionLate("2026-08-31")).toBe(false);
    now.mockReturnValue(new Date("2026-08-31T17:00:00.000Z").getTime());
    expect(isSubmissionLate("2026-08-31")).toBe(true);
    now.mockRestore();
  });
});
