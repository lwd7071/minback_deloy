import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/students/student-results-repository", () => ({
  listStudentResults: vi.fn(),
}));

import { listStudentResults } from "@/server/repositories/students/student-results-repository";
import { getStudentResults } from "./student-results-service";

describe("student results service", () => {
  it("uses the authenticated student session and returns only repository results", async () => {
    vi.mocked(listStudentResults).mockResolvedValue({
      assignments: [{ id: "a1", maxScore: 10, included: true, weight: 100 }],
      results: [
        {
          assignmentId: "a1",
          assignmentTitle: "Bài 1",
          maxScore: 10,
          score: 8,
          feedback: "Tốt",
          status: "returned",
          includedInFinal: true,
          weight: 100,
          returnedAt: "2026-09-05T00:00:00.000Z",
          updatedAt: "2026-09-05T00:00:00.000Z",
        },
      ],
    });

    const result = await getStudentResults(
      { studentId: "s1", classSectionId: "c1", sessionId: "session" },
      "a1",
    );

    expect(listStudentResults).toHaveBeenCalledWith("s1", "c1");
    expect(result.results[0]).not.toHaveProperty("submission");
    expect(result.results[0].status).toBe("returned");
    expect(result.total).toMatchObject({ score: 8, status: "final" });
  });
});
