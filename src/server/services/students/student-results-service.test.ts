import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/student-results-repository", () => ({
  listStudentResults: vi.fn(),
}));

import { listStudentResults } from "@/server/repositories/student-results-repository";
import { getStudentResults } from "./student-results-service";

describe("student results service", () => {
  it("uses the authenticated student session and returns only repository results", async () => {
    vi.mocked(listStudentResults).mockResolvedValue([
      {
        assignmentId: "a1",
        assignmentTitle: "Bài 1",
        maxScore: 10,
        score: 8,
        feedback: "Tốt",
        status: "returned",
        returnedAt: "2026-09-05T00:00:00.000Z",
        updatedAt: "2026-09-05T00:00:00.000Z",
      },
    ]);

    const result = await getStudentResults(
      { studentId: "s1", classSectionId: "c1", sessionId: "session" },
      "a1",
    );

    expect(listStudentResults).toHaveBeenCalledWith("s1", "c1", "a1");
    expect(result.results[0]).not.toHaveProperty("submission");
    expect(result.results[0].status).toBe("returned");
  });
});
