import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/teacher-auth", () => ({ requireTeacher: vi.fn() }));
vi.mock("@/server/repositories/assignments/assignment-repository", () => ({
  findAssignmentById: vi.fn(),
}));
vi.mock("@/server/services/notifications/notification-service", () => ({
  createEvaluationNotification: vi.fn(),
}));

import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import { createEvaluationNotification } from "@/server/services/notifications/notification-service";

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
    vi.mocked(createEvaluationNotification).mockResolvedValue({
      emailSent: false,
    });
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

  it("waits for changed-row notifications before resolving", async () => {
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

    let resolveNotification!: (value: { emailSent: boolean }) => void;
    vi.mocked(createEvaluationNotification).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNotification = resolve;
        }),
    );

    let settled = false;
    const resultPromise = bulkUpsertTeacherEvaluations(assignmentId, {
      evaluations: [
        { studentId, score: 8, feedback: "Tốt", status: "graded" },
      ],
    }).then((result) => {
      settled = true;
      return result;
    });

    await vi.waitFor(() => {
      expect(createEvaluationNotification).toHaveBeenCalledOnce();
    });
    expect(settled).toBe(false);

    resolveNotification({ emailSent: false });
    await expect(resultPromise).resolves.toEqual([
      { evaluationId, studentId, changeType: "updated" },
    ]);
  });

  it("keeps the bulk result successful when a notification fails", async () => {
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
    vi.mocked(createEvaluationNotification).mockRejectedValueOnce(
      new Error("notification unavailable"),
    );
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      bulkUpsertTeacherEvaluations(assignmentId, {
        evaluations: [
          { studentId, score: 8, feedback: "Tốt", status: "graded" },
        ],
      }),
    ).resolves.toEqual([{ evaluationId, studentId, changeType: "updated" }]);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(studentId);
    errorSpy.mockRestore();
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
