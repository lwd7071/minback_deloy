import { describe, expect, it } from "vitest";

import { assignmentCreateSchema } from "./assignment";

describe("Assignment validation", () => {
  it("normalizes title and applies draft/max-score defaults", () => {
    expect(
      assignmentCreateSchema.parse({
        title: "  Bài tập 1  ",
        assignedDate: "2026-09-01",
        dueDate: "2026-09-01",
      }),
    ).toMatchObject({
      title: "Bài tập 1",
      description: "",
      status: "draft",
      maxScore: 10,
    });
  });

  it("rejects impossible dates and scores outside the locked precision/range", () => {
    expect(() =>
      assignmentCreateSchema.parse({
        title: "Bài tập",
        assignedDate: "2026-09-02",
        dueDate: "2026-09-01",
      }),
    ).toThrow();
    expect(() =>
      assignmentCreateSchema.parse({
        title: "Bài tập",
        assignedDate: "2026-09-01",
        dueDate: "2026-09-02",
        maxScore: 10.25,
      }),
    ).toThrow();
  });
});
