import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/teacher-auth", () => ({ requireTeacher: vi.fn() }));
vi.mock("@/server/repositories/assignment-repository", () => ({
  findAssignmentById: vi.fn(),
}));
vi.mock("@/server/repositories/student-repository", () => ({
  findStudentById: vi.fn(),
}));
vi.mock("@/server/repositories/evaluation-repository", () => ({
  findEvaluationByPair: vi.fn(),
  insertEvaluation: vi.fn(),
  listEvaluationsWithStudents: vi.fn(),
  updateEvaluation: vi.fn(),
}));
vi.mock("@/server/services/notification-service", () => ({
  createEvaluationNotification: vi.fn(),
}));

import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignment-repository";
import {
  findEvaluationByPair,
  insertEvaluation,
  updateEvaluation,
} from "@/server/repositories/evaluation-repository";
import { findStudentById } from "@/server/repositories/student-repository";
import { createEvaluationNotification } from "@/server/services/notification-service";
import { upsertTeacherEvaluation } from "./evaluation-service";

const assignment = {
  id: "30000000-0000-0000-0000-000000000001",
  classSectionId: "10000000-0000-0000-0000-000000000001",
  title: "Assignment",
  description: "",
  assignedDate: "2026-08-01",
  dueDate: "2026-08-31",
  status: "published" as const,
  maxScore: 10,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const student = {
  id: "20000000-0000-0000-0000-000000000001",
  classSectionId: assignment.classSectionId,
  mssv: "SV001",
  fullName: "Student",
  email: null,
  nickname: "SV001",
  mustChangeNickname: false,
  mustChangePin: false,
  lockedUntil: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const saved = {
  id: "40000000-0000-0000-0000-000000000001",
  studentId: student.id,
  assignmentId: assignment.id,
  score: 8,
  feedback: "Good",
  status: "graded" as const,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("upsertTeacherEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: {} as SupabaseClient,
      teacher: {
        id: "teacher-a",
        displayName: "Teacher A",
        emailNotificationEnabled: false,
      },
    });
    vi.mocked(findAssignmentById).mockResolvedValue(assignment);
    vi.mocked(findStudentById).mockResolvedValue(student);
  });

  it("returns the committed Evaluation when post-commit Notification fails", async () => {
    vi.mocked(findEvaluationByPair).mockResolvedValue(null);
    vi.mocked(insertEvaluation).mockResolvedValue(saved);
    vi.mocked(createEvaluationNotification).mockRejectedValue(
      new Error("WEB_NOTIFICATION_INSERT_FAILED"),
    );

    await expect(
      upsertTeacherEvaluation(assignment.id, student.id, {
        score: 8,
        feedback: "Good",
        status: "graded",
      }),
    ).resolves.toEqual(saved);
    expect(insertEvaluation).toHaveBeenCalledOnce();
    expect(createEvaluationNotification).toHaveBeenCalledOnce();
    expect(
      vi.mocked(insertEvaluation).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(createEvaluationNotification).mock.invocationCallOrder[0],
    );
  });

  it("does not update or notify for an identical payload", async () => {
    vi.mocked(findEvaluationByPair).mockResolvedValue(saved);

    await expect(
      upsertTeacherEvaluation(assignment.id, student.id, {
        score: 8,
        feedback: "Good",
        status: "graded",
      }),
    ).resolves.toEqual(saved);
    expect(updateEvaluation).not.toHaveBeenCalled();
    expect(createEvaluationNotification).not.toHaveBeenCalled();
  });

  it("does not notify when the Evaluation write fails before commit", async () => {
    vi.mocked(findEvaluationByPair).mockResolvedValue(null);
    vi.mocked(insertEvaluation).mockRejectedValue(
      new Error("EVALUATION_CREATE_FAILED"),
    );

    await expect(
      upsertTeacherEvaluation(assignment.id, student.id, {
        score: 8,
        feedback: "Good",
        status: "graded",
      }),
    ).rejects.toMatchObject({ status: 500, code: "INTERNAL_ERROR" });
    expect(createEvaluationNotification).not.toHaveBeenCalled();
  });
});
