import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/assignments/assignment-repository", () => ({
  findAssignmentById: vi.fn(),
}));
vi.mock("@/server/repositories/students/student-repository", () => ({
  findStudentById: vi.fn(),
}));
vi.mock("@/server/repositories/evaluations/evaluation-repository", () => ({
  findEvaluationByPair: vi.fn(),
  insertEvaluation: vi.fn(),
  listEvaluationsWithStudents: vi.fn(),
  updateEvaluation: vi.fn(),
}));
vi.mock("@/server/services/notifications/notification-service", () => ({
  createEvaluationNotification: vi.fn(),
}));

import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import {
  findEvaluationByPair,
  insertEvaluation,
} from "@/server/repositories/evaluations/evaluation-repository";
import { findStudentById } from "@/server/repositories/students/student-repository";
import {
  upsertTeacherEvaluation,
  type TeacherEvaluationContext,
} from "./evaluation-service";

const criteria = [
  { name: "A", weight: 20 },
  { name: "B", weight: 30 },
  { name: "C", weight: 50 },
];
const assignment = {
  id: "30000000-0000-0000-0000-000000000001",
  classSectionId: "10000000-0000-0000-0000-000000000001",
  title: "Assignment",
  description: "",
  assignedDate: "2026-08-01",
  dueDate: "2026-08-31",
  status: "published" as const,
  maxScore: 10,
  criteria,
  createdAt: "",
  updatedAt: "",
};
const student = { id: "20000000-0000-0000-0000-000000000001" };
const context: TeacherEvaluationContext = {
  teacherId: "teacher-a",
  supabase: {} as SupabaseClient,
};

describe("upsertTeacherEvaluation với tiêu chí", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAssignmentById).mockResolvedValue(assignment as never);
    vi.mocked(findStudentById).mockResolvedValue(student as never);
    vi.mocked(findEvaluationByPair).mockResolvedValue(null);
    vi.mocked(insertEvaluation).mockResolvedValue({ id: "e-1" } as never);
  });

  it("tự tính điểm tổng từ criteriaScores, bỏ qua score client gửi", async () => {
    await upsertTeacherEvaluation(
      assignment.id,
      student.id,
      {
        score: 1,
        feedback: "ok",
        status: "graded",
        criteriaScores: [
          { name: "A", score: 10 },
          { name: "B", score: 8 },
          { name: "C", score: 6 },
        ],
      },
      context,
    );
    const saved = vi.mocked(insertEvaluation).mock.calls[0][3];
    expect(saved.score).toBe(7.4);
    expect(saved.criteriaScores).toEqual([
      { name: "A", weight: 20, score: 10 },
      { name: "B", weight: 30, score: 8 },
      { name: "C", weight: 50, score: 6 },
    ]);
  });

  it("từ chối khi điểm tiêu chí ngoài 0-10", async () => {
    await expect(
      upsertTeacherEvaluation(
        assignment.id,
        student.id,
        {
          score: 5,
          feedback: "",
          status: "graded",
          criteriaScores: [
            { name: "A", score: 11 },
            { name: "B", score: 8 },
            { name: "C", score: 6 },
          ],
        },
        context,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(insertEvaluation).not.toHaveBeenCalled();
  });

  it("từ chối khi thiếu một tiêu chí của bài", async () => {
    await expect(
      upsertTeacherEvaluation(
        assignment.id,
        student.id,
        {
          score: 5,
          feedback: "",
          status: "graded",
          criteriaScores: [{ name: "A", score: 5 }],
        },
        context,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("trạng thái pending (xóa điểm) không cần criteriaScores", async () => {
    await upsertTeacherEvaluation(
      assignment.id,
      student.id,
      { score: null, feedback: "", status: "pending" },
      context,
    );
    const saved = vi.mocked(insertEvaluation).mock.calls[0][3];
    expect(saved.score).toBeNull();
  });
});
