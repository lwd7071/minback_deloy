import { beforeEach, describe, expect, it, vi } from "vitest";
import exceljs from "exceljs";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/teacher-auth", () => ({ requireTeacher: vi.fn() }));
vi.mock("@/server/repositories/assignments/assignment-repository", () => ({
  findAssignmentById: vi.fn(),
}));

import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import { generateEvaluationExport } from "./evaluation-export-service";

const { Workbook } = exceljs;
const assignmentId = "assignment-1";
const teacherId = "teacher-1";
const assignment = {
  id: assignmentId,
  classSectionId: "class-1",
  title: "Bài tập cuối kỳ",
  description: "",
  assignedDate: "2026-10-01",
  dueDate: "2026-10-10",
  maxScore: 10,
  status: "published" as const,
  criteria: [{ name: "Báo cáo", weight: 100 }],
  createdAt: "",
  updatedAt: "",
};

function fakeSupabase() {
  const rows = {
    students: [
      { id: "student-1", mssv: "001234", full_name: "Nguyễn An" },
      { id: "student-2", mssv: "001235", full_name: "Trần Bình" },
    ],
    evaluations: [
      {
        student_id: "student-1",
        score: 0,
        feedback: "Chưa đạt",
        criteria_scores: [{ name: "Báo cáo", weight: 100, score: 0 }],
      },
    ],
  };

  return {
    from: (table: keyof typeof rows) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            range: async (start: number, end: number) => ({
              data: rows[table].slice(start, end + 1),
              error: null,
            }),
          }),
          range: async (start: number, end: number) => ({
            data: rows[table].slice(start, end + 1),
            error: null,
          }),
        }),
      }),
    }),
  };
}

describe("Evaluation Export Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeacher).mockResolvedValue({
      teacher: { id: teacherId } as never,
      supabase: fakeSupabase() as never,
    });
    vi.mocked(findAssignmentById).mockResolvedValue(assignment);
  });

  it("exports saved evaluations and every student in the teacher-owned assignment", async () => {
    const result = await generateEvaluationExport(assignmentId);
    const workbook = new Workbook();
    await workbook.xlsx.load(result.buffer as never);
    const sheet = workbook.getWorksheet("BangDiem");

    expect(findAssignmentById).toHaveBeenCalledWith(assignmentId, teacherId);
    expect(sheet?.rowCount).toBe(3);
    expect(sheet?.getRow(2).getCell(1).value).toBe("001234");
    expect(sheet?.getRow(2).getCell(3).value).toBe(0);
    expect(sheet?.getRow(2).getCell(4).value).toBe(0);
    expect(sheet?.getRow(3).getCell(1).value).toBe("001235");
    expect(sheet?.getRow(3).getCell(3).value).toBeNull();
  });

  it("does not export an assignment the teacher cannot access", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(null);

    await expect(generateEvaluationExport(assignmentId)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
