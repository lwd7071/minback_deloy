import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () =>
    "/admin/classes/class-123/assignments/assignment-123/grade",
}));

import { BulkGradeView } from "../bulk-grade-view";
import type { AssignmentDto } from "@/types/assignment";

describe("BulkGradeView", () => {
  afterEach(() => {
    cleanup();
  });

  const mockAssignment: AssignmentDto = {
    id: "assignment-123",
    classSectionId: "class-123",
    title: "BÀI MỚI",
    description: "Mô tả bài tập",
    assignedDate: "2026-10-01T00:00:00.000Z",
    dueDate: "2026-10-10T00:00:00.000Z",
    maxScore: 10,
    status: "published",
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z",
  };

  it("renders a 'Tải file mẫu' download link next to the 'Nhập file điểm' button", () => {
    render(
      <BulkGradeView
        classSectionId="class-123"
        assignment={mockAssignment}
        students={[]}
        studentMeta={{ page: 1, pageSize: 50, total: 0 }}
        initialSearch=""
        evaluations={[]}
      />,
    );

    const importBtn = screen.getByRole("button", { name: /nhập file điểm/i });
    expect(importBtn).toBeInTheDocument();

    const templateLink = screen.getByRole("link", { name: /tải file mẫu/i });
    expect(templateLink).toBeInTheDocument();
    expect(templateLink).toHaveAttribute(
      "href",
      "/api/v1/teacher/assignments/assignment-123/evaluations/import-template",
    );
    expect(templateLink).toHaveAttribute("download");
  });

  it("enters edit mode when clicking the edit button on a student row", async () => {
    const mockStudents = [
      {
        id: "student-1",
        classSectionId: "class-123",
        mssv: "24110200",
        fullName: "Nguyễn Văn C",
        email: null,
        nickname: "C",
        mustChangeNickname: false,
        mustChangePin: false,
        lockedUntil: null,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];

    const mockEvaluations = [
      {
        id: "eval-1",
        assignmentId: "assignment-123",
        studentId: "student-1",
        score: 8,
        feedback: "Làm tốt",
        status: "graded" as const,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
        student: {
          id: "student-1",
          mssv: "24110200",
          fullName: "Nguyễn Văn C",
          nickname: "C",
        },
      },
    ];

    render(
      <BulkGradeView
        classSectionId="class-123"
        assignment={mockAssignment}
        students={mockStudents}
        studentMeta={{ page: 1, pageSize: 50, total: 1 }}
        initialSearch=""
        evaluations={mockEvaluations}
      />,
    );

    const editButton = screen.getByRole("button", { name: /sửa/i });
    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton);

    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Làm tốt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lưu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hủy/i })).toBeInTheDocument();
  });

  it("cancels edit mode and restores original values when clicking Hủy", () => {
    const mockStudents = [
      {
        id: "student-1",
        classSectionId: "class-123",
        mssv: "24110200",
        fullName: "Nguyễn Văn C",
        email: null,
        nickname: "C",
        mustChangeNickname: false,
        mustChangePin: false,
        lockedUntil: null,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];

    const mockEvaluations = [
      {
        id: "eval-1",
        assignmentId: "assignment-123",
        studentId: "student-1",
        score: 8,
        feedback: "Làm tốt",
        status: "graded" as const,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
        student: {
          id: "student-1",
          mssv: "24110200",
          fullName: "Nguyễn Văn C",
          nickname: "C",
        },
      },
    ];

    render(
      <BulkGradeView
        classSectionId="class-123"
        assignment={mockAssignment}
        students={mockStudents}
        studentMeta={{ page: 1, pageSize: 50, total: 1 }}
        initialSearch=""
        evaluations={mockEvaluations}
      />,
    );

    const editButton = screen.getByRole("button", { name: /sửa/i });
    fireEvent.click(editButton);

    const scoreInput = screen.getByDisplayValue("8");
    fireEvent.change(scoreInput, { target: { value: "9.5" } });

    const cancelButton = screen.getByRole("button", { name: /hủy/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole("button", { name: /hủy/i })).not.toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.queryByText("9.5")).not.toBeInTheDocument();
  });

  it("shows an error and prevents saving when score exceeds maxScore", () => {
    const mockStudents = [
      {
        id: "student-1",
        classSectionId: "class-123",
        mssv: "24110200",
        fullName: "Nguyễn Văn C",
        email: null,
        nickname: "C",
        mustChangeNickname: false,
        mustChangePin: false,
        lockedUntil: null,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];

    const mockEvaluations = [
      {
        id: "eval-1",
        assignmentId: "assignment-123",
        studentId: "student-1",
        score: 8,
        feedback: "Làm tốt",
        status: "graded" as const,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
        student: {
          id: "student-1",
          mssv: "24110200",
          fullName: "Nguyễn Văn C",
          nickname: "C",
        },
      },
    ];

    render(
      <BulkGradeView
        classSectionId="class-123"
        assignment={mockAssignment}
        students={mockStudents}
        studentMeta={{ page: 1, pageSize: 50, total: 1 }}
        initialSearch=""
        evaluations={mockEvaluations}
      />,
    );

    const editButton = screen.getByRole("button", { name: /sửa/i });
    fireEvent.click(editButton);

    const scoreInput = screen.getByDisplayValue("8");
    fireEvent.change(scoreInput, { target: { value: "15" } });

    const saveButton = screen.getByRole("button", { name: /lưu/i });
    fireEvent.click(saveButton);

    expect(screen.getByText(/điểm tối đa là 10/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lưu/i })).toBeInTheDocument();
  });

  it("saves successfully and updates display when valid score is submitted", async () => {
    const mockStudents = [
      {
        id: "student-1",
        classSectionId: "class-123",
        mssv: "24110200",
        fullName: "Nguyễn Văn C",
        email: null,
        nickname: "C",
        mustChangeNickname: false,
        mustChangePin: false,
        lockedUntil: null,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];

    const mockEvaluations = [
      {
        id: "eval-1",
        assignmentId: "assignment-123",
        studentId: "student-1",
        score: 8,
        feedback: "Làm tốt",
        status: "graded" as const,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
        student: {
          id: "student-1",
          mssv: "24110200",
          fullName: "Nguyễn Văn C",
          nickname: "C",
        },
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "eval-1",
            assignmentId: "assignment-123",
            studentId: "student-1",
            score: 9.5,
            feedback: "Xuất sắc",
            status: "graded",
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(
      <BulkGradeView
        classSectionId="class-123"
        assignment={mockAssignment}
        students={mockStudents}
        studentMeta={{ page: 1, pageSize: 50, total: 1 }}
        initialSearch=""
        evaluations={mockEvaluations}
      />,
    );

    const editButton = screen.getByRole("button", { name: /sửa/i });
    fireEvent.click(editButton);

    const scoreInput = screen.getByDisplayValue("8");
    fireEvent.change(scoreInput, { target: { value: "9.5" } });
    const feedbackInput = screen.getByDisplayValue("Làm tốt");
    fireEvent.change(feedbackInput, { target: { value: "Xuất sắc" } });

    const saveButton = screen.getByRole("button", { name: /lưu/i });
    fireEvent.click(saveButton);

    await screen.findByText("9.5");
    expect(screen.getByText("Xuất sắc")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/teacher/assignments/assignment-123/students/student-1/evaluation",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          score: 9.5,
          feedback: "Xuất sắc",
          status: "graded",
        }),
      }),
    );
    fetchSpy.mockRestore();
  });
});


