import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/server/repositories/student-repository", () => ({
  findStudentById: vi.fn(),
  listStudentsByClassSection: vi.fn(),
  updateStudentByTeacher: vi.fn(),
}));
vi.mock("@/server/services/students/student-auth-service", () => ({
  resetStudentPin: vi.fn(),
}));
vi.mock("@/server/repositories/evaluation-history-repository", () => ({
  findEvaluationOwnerTeacherId: vi.fn(),
  listEvaluationHistoryRows: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  findEvaluationOwnerTeacherId,
  listEvaluationHistoryRows,
} from "@/server/repositories/evaluation-history-repository";
import { getEvaluationHistory } from "./evaluation-history-service";
import { getStudentInClass } from "@/server/services/students/student-management-service";

function teacherClientWithNoMatchingClass() {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  query.eq.mockReturnValue(query);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "teacher-a" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }),
  };
}

describe("Teacher resource privacy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("conceals another Teacher's ClassSection as not found", async () => {
    vi.mocked(createClient).mockResolvedValue(
      teacherClientWithNoMatchingClass() as never,
    );

    await expect(
      getStudentInClass("class-b", "student-b"),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("conceals another Teacher's Evaluation history as not found", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "teacher-a" } },
          error: null,
        }),
      },
    } as never);
    vi.mocked(findEvaluationOwnerTeacherId).mockResolvedValue("teacher-b");

    await expect(getEvaluationHistory("evaluation-b")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});
