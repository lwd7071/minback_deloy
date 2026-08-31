import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/teacher-auth", () => ({ requireTeacher: vi.fn() }));
vi.mock("@/server/repositories/assignment-repository", () => ({
  findAssignmentById: vi.fn(),
}));
vi.mock("@/server/services/notification-service", () => ({
  createEvaluationNotification: vi.fn(),
}));

import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignment-repository";
import { createEvaluationNotification } from "@/server/services/notification-service";

import { bulkUpsertTeacherEvaluations } from "./bulk-evaluation-service";

const teacherId = "11111111-1111-4111-8111-111111111111";
const assignmentId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";
const evaluationId = "44444444-4444-4444-8444-444444444444";

describe("bulkUpsertTeacherEvaluations", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: { rpc } as never,
      teacher: { id: teacherId } as never,
    });
    vi.mocked(findAssignmentById).mockResolvedValue({
      id: assignmentId,
      classSectionId: "55555555-5555-4555-8555-555555555555",
      title: "Bài kiểm tra",
      description: "",
      assignedDate: "2026-08-31",
      dueDate: "2026-09-01",
      status: "published",
      maxScore: 10,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
    vi.mocked(createEvaluationNotification).mockResolvedValue(undefined);
  });

  it("authenticates before rejecting a malformed batch", async () => {
    await expect(
      bulkUpsertTeacherEvaluations(assignmentId, { evaluations: [] }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    expect(requireTeacher).toHaveBeenCalledOnce();
    expect(findAssignmentById).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("notifies only rows that the atomic RPC reports as changed", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: evaluationId,
          student_id: studentId,
          change_type: "updated",
        },
      ],
      error: null,
    });

    await expect(
      bulkUpsertTeacherEvaluations(assignmentId, {
        evaluations: [
          { studentId, score: 8, feedback: "Tốt", status: "graded" },
        ],
      }),
    ).resolves.toEqual([{ evaluationId, studentId, changeType: "updated" }]);
    expect(createEvaluationNotification).toHaveBeenCalledWith({
      studentId,
      evaluationId,
      type: "evaluation_updated",
      assignmentTitle: "Bài kiểm tra",
    });
  });

  it("does not notify when every row is a no-op", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await bulkUpsertTeacherEvaluations(assignmentId, {
      evaluations: [
        { studentId, score: null, feedback: "", status: "pending" },
      ],
    });

    expect(createEvaluationNotification).not.toHaveBeenCalled();
  });
});
