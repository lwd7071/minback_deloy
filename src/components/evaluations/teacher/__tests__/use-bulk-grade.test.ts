import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignmentDto } from "@/types/assignment";
import type { EvaluationWithStudentDto } from "@/types/evaluation";
import type { StudentAdminDto } from "@/types/student";
import { useBulkGrade } from "../use-bulk-grade";

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));

const mockAssignment: AssignmentDto = {
  id: "assign-1",
  classSectionId: "class-1",
  title: "Bài tập 1",
  description: "Mô tả",
  assignedDate: "2026-09-01T08:00:00.000Z",
  dueDate: "2026-09-10T23:59:59.000Z",
  status: "published",
  maxScore: 10,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
};

const mockStudents: StudentAdminDto[] = [
  {
    id: "student-1",
    classSectionId: "class-1",
    mssv: "SV001",
    fullName: "Nguyễn Văn A",
    email: null,
    nickname: "A Nguyễn",
    mustChangeNickname: false,
    mustChangePin: false,
    lockedUntil: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "student-2",
    classSectionId: "class-1",
    mssv: "SV002",
    fullName: "Trần Thị B",
    email: null,
    nickname: "B Trần",
    mustChangeNickname: false,
    mustChangePin: false,
    lockedUntil: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "student-3",
    classSectionId: "class-1",
    mssv: "SV003",
    fullName: "Lê Văn C",
    email: null,
    nickname: "C Lê",
    mustChangeNickname: false,
    mustChangePin: false,
    lockedUntil: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  },
];

const mockEvaluations: EvaluationWithStudentDto[] = [
  {
    id: "eval-1",
    assignmentId: "assign-1",
    studentId: "student-1",
    score: 9,
    feedback: "Tốt",
    status: "graded",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    student: {
      id: "student-1",
      mssv: "SV001",
      fullName: "Nguyễn Văn A",
      nickname: "A Nguyễn",
    },
  },
  {
    id: "eval-2",
    assignmentId: "assign-1",
    studentId: "student-2",
    score: 8,
    feedback: "Khá",
    status: "returned",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    student: {
      id: "student-2",
      mssv: "SV002",
      fullName: "Trần Thị B",
      nickname: "B Trần",
    },
  },
];

describe("useBulkGrade hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tính toán đúng metrics và maps sinh viên", () => {
    const { result } = renderHook(() =>
      useBulkGrade({
        classSectionId: "class-1",
        assignment: mockAssignment,
        students: mockStudents,
        studentMeta: { page: 1, pageSize: 10, total: 3 },
        initialSearch: "",
        initialEvaluations: mockEvaluations,
      }),
    );

    expect(result.current.metrics).toEqual({
      total: 3,
      graded: 1,
      returned: 1,
      missing: 1,
    });
    expect(result.current.pages).toBe(1);
    expect(result.current.gradedRows).toHaveLength(1);
    expect(result.current.byStudentId.get("student-1")?.score).toBe(9);
    expect(result.current.byStudentId.get("student-2")?.score).toBe(8);
    expect(result.current.byStudentId.get("student-3")).toBeUndefined();
  });

  it("tạo đúng link phân trang qua pageHref", () => {
    const { result } = renderHook(() =>
      useBulkGrade({
        classSectionId: "class-1",
        assignment: mockAssignment,
        students: mockStudents,
        studentMeta: { page: 1, pageSize: 1, total: 3 },
        initialSearch: "nguyen",
        initialEvaluations: mockEvaluations,
      }),
    );

    expect(result.current.pages).toBe(3);
    expect(result.current.pageHref(2)).toBe(
      "/admin/classes/class-1/assignments/assign-1/grade?q=nguyen&page=2",
    );
  });

  it("cập nhật state khi import thành công", () => {
    const { result } = renderHook(() =>
      useBulkGrade({
        classSectionId: "class-1",
        assignment: mockAssignment,
        students: mockStudents,
        studentMeta: { page: 1, pageSize: 10, total: 3 },
        initialSearch: "",
        initialEvaluations: mockEvaluations,
      }),
    );

    act(() => {
      result.current.handleImportSuccess({
        mode: "publish",
        count: 1,
        updatedEvaluations: [
          {
            studentId: "student-3",
            score: 10,
            feedback: "Xuất sắc",
            status: "returned",
          },
        ],
      });
    });

    expect(result.current.byStudentId.get("student-3")?.score).toBe(10);
    expect(result.current.metrics.returned).toBe(2);
    expect(result.current.metrics.missing).toBe(0);
    expect(result.current.message).toContain("Đã công bố kết quả cho 1 sinh viên");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
