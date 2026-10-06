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
import { previewEvaluationFile } from "./evaluation-import-service";

const STUDENT_A = { id: "s-a", mssv: "24110001", full_name: "Vĩ Đông" };
const STUDENT_B = { id: "s-b", mssv: "24110002", full_name: "Trần Thị B" };

// Fake supabase: from(table).select().eq() -> { data }
function fakeSupabase(evaluations: unknown[] = []) {
  const tables: Record<string, unknown[]> = {
    students: [STUDENT_A, STUDENT_B],
    evaluations,
  };
  return {
    from: (table: string) => ({
      select: () => ({
        eq: async () => ({ data: tables[table] ?? [], error: null }),
      }),
    }),
  };
}

function csv(lines: string[]) {
  return new TextEncoder().encode(lines.join("\n")).buffer as ArrayBuffer;
}

function mockAssignment(extra: Record<string, unknown> = {}) {
  vi.mocked(findAssignmentById).mockResolvedValue({
    id: "as-1",
    classSectionId: "cs-1",
    title: "Bài tập",
    description: "",
    assignedDate: "2026-08-31",
    dueDate: "2026-09-01",
    status: "published",
    maxScore: 10,
    createdAt: "",
    updatedAt: "",
    ...extra,
  } as never);
}

describe("previewEvaluationFile với tiêu chí (xx%)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: fakeSupabase() as never,
      teacher: { id: "t-1" } as never,
    });
    mockAssignment();
  });

  it("tự tính điểm tổng từ các cột có %, bỏ qua cột Điểm trong file", async () => {
    const preview = await previewEvaluationFile(
      "as-1",
      csv([
        "MSSV,Họ tên,Báo cáo (20%),Demo (30%),Cột phụ,Vấn đáp (50%),Điểm,Feedback",
        "24110001,Vĩ Đông,10,8,x,6,99,Tốt",
      ]),
      "a.csv",
    );
    expect(preview.criteria).toEqual([
      { name: "Báo cáo", weight: 20 },
      { name: "Demo", weight: 30 },
      { name: "Vấn đáp", weight: 50 },
    ]);
    const row = preview.rows[0];
    expect(row.status).toBe("valid");
    expect(row.score).toBe(7.4);
    expect(row.criteriaScores).toEqual([
      { name: "Báo cáo", weight: 20, score: 10 },
      { name: "Demo", weight: 30, score: 8 },
      { name: "Vấn đáp", weight: 50, score: 6 },
    ]);
  });

  it("từ chối cả file khi tổng % khác 100", async () => {
    await expect(
      previewEvaluationFile(
        "as-1",
        csv([
          "MSSV,Họ tên,A (30%),B (30%),Điểm,Feedback",
          "24110001,Vĩ Đông,8,8,,",
        ]),
        "a.csv",
      ),
    ).rejects.toThrow("100%");
  });

  it("báo lỗi dòng khi thiếu điểm một tiêu chí", async () => {
    const preview = await previewEvaluationFile(
      "as-1",
      csv([
        "MSSV,Họ tên,A (40%),B (60%),Điểm,Feedback",
        "24110001,Vĩ Đông,8,,,",
      ]),
      "a.csv",
    );
    expect(preview.rows[0].status).toBe("invalid");
    expect(preview.rows[0].errors?.[0].message).toContain("Thiếu điểm B");
  });

  it("báo lỗi khi điểm tiêu chí ngoài khoảng 0-10 hoặc không phải số", async () => {
    const preview = await previewEvaluationFile(
      "as-1",
      csv([
        "MSSV,Họ tên,A (40%),B (60%),Điểm,Feedback",
        "24110001,Vĩ Đông,11,5,,",
        "24110002,Trần Thị B,abc,5,,",
      ]),
      "a.csv",
    );
    expect(preview.rows.map((r) => r.status)).toEqual(["invalid", "invalid"]);
    expect(preview.rows[0].errors?.[0].message).toContain("A");
    expect(preview.rows[1].errors?.[0].message).toContain("A");
  });

  it("quy đổi theo maxScore của bài", async () => {
    mockAssignment({ maxScore: 100 });
    const preview = await previewEvaluationFile(
      "as-1",
      csv(["MSSV,Họ tên,A (100%),Điểm,Feedback", "24110001,Vĩ Đông,8,,"]),
      "a.csv",
    );
    expect(preview.rows[0].score).toBe(80);
  });

  it("giữ luồng cũ khi không có cột %", async () => {
    const preview = await previewEvaluationFile(
      "as-1",
      csv(["MSSV,Họ tên,Điểm,Feedback", "24110001,Vĩ Đông,9,Tốt"]),
      "a.csv",
    );
    expect(preview.criteria ?? []).toEqual([]);
    expect(preview.rows[0].score).toBe(9);
    expect(preview.rows[0].criteriaScores).toBeUndefined();
  });

  it("cảnh báo khi bài đã có kết quả và khi tiêu chí thay đổi", async () => {
    mockAssignment({ criteria: [{ name: "Cũ", weight: 100 }] });
    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: fakeSupabase([
        { student_id: "s-a", score: 5, feedback: "" },
      ]) as never,
      teacher: { id: "t-1" } as never,
    });
    const preview = await previewEvaluationFile(
      "as-1",
      csv(["MSSV,Họ tên,Mới (100%),Điểm,Feedback", "24110001,Vĩ Đông,8,,"]),
      "a.csv",
    );
    const messages = (preview.warnings ?? []).map((w) => w.message).join("|");
    expect(messages).toContain("Tiêu chí thay đổi");
    expect(messages).toContain("đã có");
  });
});
