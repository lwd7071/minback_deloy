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

import {
  MAX_EVALUATION_IMPORT_FILE_BYTES,
  executeEvaluationImport,
  normalizeHeaderKey,
  parseEvaluationCsv,
  resolveEvaluationColumns,
} from "./evaluation-import-service";

describe("Evaluation Import Service", () => {
  const teacherId = "11111111-1111-4111-8111-111111111111";
  const assignmentId = "22222222-2222-4222-8222-222222222222";
  const studentId = "33333333-3333-4333-8333-333333333333";
  const evaluationId = "44444444-4444-4444-8444-444444444444";
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
      title: "Bài tập lớn",
      description: "",
      assignedDate: "2026-08-31",
      dueDate: "2026-09-01",
      status: "published",
      maxScore: 10,
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
    vi.mocked(createEvaluationNotification).mockResolvedValue({
      emailSent: true,
    });
  });

  it("normalizes Vietnamese headers", () => {
    expect(normalizeHeaderKey("Điểm")).toBe("diem");
    expect(normalizeHeaderKey("Nhận xét")).toBe("nhanxet");
    expect(normalizeHeaderKey("MSSV")).toBe("mssv");
  });

  it("parses quoted CSV records", () => {
    const rows = parseEvaluationCsv(
      [
        "MSSV,Họ Tên,Điểm,Nhận xét",
        '22110001,Nguyễn Văn An,9.5,"Tốt, tiếp tục"',
      ].join("\n"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[1].cells[3]).toBe("Tốt, tiếp tục");
  });

  it("keeps the five megabyte limit", () => {
    expect(MAX_EVALUATION_IMPORT_FILE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("requires four semantic columns and rejects duplicates", () => {
    expect(
      resolveEvaluationColumns(["MSSV", "Họ tên", "Điểm", "Feedback"]),
    ).toEqual({ mssvIndex: 0, nameIndex: 1, scoreIndex: 2, feedbackIndex: 3 });
    expect(() => resolveEvaluationColumns(["MSSV", "Điểm"])).toThrow();
    expect(() =>
      resolveEvaluationColumns(["MSSV", "Họ tên", "Điểm", "Feedback", "Score"]),
    ).toThrow();
  });

  it("does not send notifications when importing with mode save_draft", async () => {
    rpc.mockResolvedValue({
      data: [
        { id: evaluationId, student_id: studentId, change_type: "updated" },
      ],
      error: null,
    });

    const result = await executeEvaluationImport(assignmentId, {
      mode: "save_draft",
      evaluations: [{ studentId, score: 8, feedback: "Tốt" }],
    });

    expect(result.mode).toBe("save_draft");
    expect(result.summary?.notifications.sent).toBe(0);
    expect(result.summary?.emails.sent).toBe(0);
    expect(createEvaluationNotification).not.toHaveBeenCalled();
  });

  it("schedules background notifications with concurrency limit when mode is publish", async () => {
    rpc.mockResolvedValue({
      data: [
        { id: evaluationId, student_id: studentId, change_type: "updated" },
      ],
      error: null,
    });

    const result = await executeEvaluationImport(assignmentId, {
      mode: "publish",
      evaluations: [{ studentId, score: 9, feedback: "Xuất sắc" }],
    });

    expect(result.mode).toBe("publish");
    expect(result.summary?.notifications.sent).toBe(1);
    expect(result.summary?.emails.sent).toBe(1);
    expect(createEvaluationNotification).toHaveBeenCalledWith({
      studentId,
      evaluationId,
      type: "evaluation_updated",
      assignmentTitle: "Bài tập lớn",
    });
  });

  it("chunks evaluations into batches of 100 when importing > 100 items", async () => {
    rpc.mockImplementation(
      async (_fn: string, params: { p_rows: unknown[] }) => ({
        data: params.p_rows.map((_, i) => ({
          id: `eval-${i}`,
          student_id: studentId,
          change_type: "created" as const,
        })),
        error: null,
      }),
    );

    const evaluations = Array.from({ length: 250 }, (_, i) => ({
      studentId,
      score: 8,
      feedback: `Nhận xét ${i + 1}`,
    }));

    const result = await executeEvaluationImport(assignmentId, {
      mode: "save_draft",
      evaluations,
    });

    expect(result.mode).toBe("save_draft");
    // 250 items with batch size 100 -> 3 RPC calls (100, 100, 50)
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls[0][1].p_rows.length).toBe(100);
    expect(rpc.mock.calls[1][1].p_rows.length).toBe(100);
    expect(rpc.mock.calls[2][1].p_rows.length).toBe(50);
  });
});
