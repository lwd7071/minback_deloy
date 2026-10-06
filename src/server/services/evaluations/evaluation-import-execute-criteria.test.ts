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
import { executeEvaluationImport } from "./evaluation-import-service";

const assignmentId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";

const criteria = [
  { name: "A", weight: 20 },
  { name: "B", weight: 30 },
  { name: "C", weight: 50 },
];
const criteriaScores = [
  { name: "A", weight: 20, score: 10 },
  { name: "B", weight: 30, score: 8 },
  { name: "C", weight: 50, score: 6 },
];

describe("executeEvaluationImport với tiêu chí", () => {
  const rpc = vi.fn();
  const assignmentEq = vi.fn();
  const assignmentUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({
      data: [{ id: "e-1", student_id: studentId, change_type: "created" }],
      error: null,
    });
    assignmentEq.mockResolvedValue({ error: null });
    assignmentUpdate.mockReturnValue({ eq: assignmentEq });
    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: {
        rpc,
        from: () => ({ update: assignmentUpdate }),
      } as never,
      teacher: { id: "t-1" } as never,
    });
    vi.mocked(findAssignmentById).mockResolvedValue({
      id: assignmentId,
      classSectionId: "cs-1",
      title: "Bài tập",
      description: "",
      assignedDate: "",
      dueDate: "",
      status: "published",
      maxScore: 10,
      createdAt: "",
      updatedAt: "",
    } as never);
  });

  it("tính lại điểm tổng từ criteriaScores, bỏ qua score do client gửi", async () => {
    await executeEvaluationImport(assignmentId, {
      mode: "save_draft",
      criteria,
      evaluations: [{ studentId, score: 99, feedback: "ok", criteriaScores }],
    } as never);

    const rows = rpc.mock.calls[0][1].p_rows;
    expect(rows[0].score).toBe(7.4);
    expect(rows[0].criteriaScores).toEqual(criteriaScores);
  });

  it("lưu tiêu chí vào bài tập khi import", async () => {
    await executeEvaluationImport(assignmentId, {
      mode: "save_draft",
      criteria,
      evaluations: [{ studentId, score: null, feedback: "", criteriaScores }],
    } as never);

    expect(assignmentUpdate).toHaveBeenCalledWith({ criteria });
    expect(assignmentEq).toHaveBeenCalledWith("id", assignmentId);
  });

  it("từ chối khi tổng trọng số khác 100", async () => {
    await expect(
      executeEvaluationImport(assignmentId, {
        mode: "save_draft",
        criteria: [{ name: "A", weight: 50 }],
        evaluations: [
          {
            studentId,
            score: null,
            feedback: "",
            criteriaScores: [{ name: "A", weight: 50, score: 8 }],
          },
        ],
      } as never),
    ).rejects.toThrow("100%");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("từ chối khi điểm tiêu chí ngoài 0-10", async () => {
    await expect(
      executeEvaluationImport(assignmentId, {
        mode: "save_draft",
        criteria: [{ name: "A", weight: 100 }],
        evaluations: [
          {
            studentId,
            score: null,
            feedback: "",
            criteriaScores: [{ name: "A", weight: 100, score: 11 }],
          },
        ],
      } as never),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("giữ luồng cũ khi không có criteria", async () => {
    await executeEvaluationImport(assignmentId, {
      mode: "save_draft",
      evaluations: [{ studentId, score: 8, feedback: "Tốt" }],
    } as never);

    const rows = rpc.mock.calls[0][1].p_rows;
    expect(rows[0].score).toBe(8);
    expect(rows[0].criteriaScores).toBeUndefined();
    expect(assignmentUpdate).not.toHaveBeenCalled();
  });
});
