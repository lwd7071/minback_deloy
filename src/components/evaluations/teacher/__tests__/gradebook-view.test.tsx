import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GradebookDto } from "@/types/gradebook";
import {
  GradebookCell,
  GradebookHeader,
  GradebookRow,
  GradebookView,
} from "../gradebook-view";

const mockGradebookData: GradebookDto = {
  students: [
    {
      id: "student-1",
      mssv: "SV001",
      fullName: "Nguyễn Văn A",
      nickname: "A Nguyễn",
    },
    {
      id: "student-2",
      mssv: "SV002",
      fullName: "Trần Thị B",
      nickname: "B Trần",
    },
  ],
  assignments: [
    {
      id: "assign-1",
      title: "Bài tập 1",
      maxScore: 10,
      status: "published",
    },
    {
      id: "assign-2",
      title: "Bài tập 2",
      maxScore: 100,
      status: "closed",
    },
  ],
  evaluations: {
    "student-1": {
      "assign-1": {
        id: "eval-1",
        score: 9.5,
        status: "returned",
      },
    },
    "student-2": {
      "assign-2": {
        id: "eval-2",
        score: 85,
        status: "graded",
      },
    },
  },
  meta: {
    students: { page: 1, pageSize: 20, total: 2 },
    assignments: { page: 1, pageSize: 20, total: 2 },
  },
};

describe("Gradebook Components (Interface Segregation Principle - ISP)", () => {
  afterEach(() => {
    cleanup();
  });

  it("GradebookHeader chỉ nhận assignments và render chính xác", () => {
    render(
      <table>
        <GradebookHeader assignments={mockGradebookData.assignments} />
      </table>,
    );

    expect(screen.getByText("Sinh viên")).toBeInTheDocument();
    expect(screen.getByText("Bài tập 1")).toBeInTheDocument();
    expect(screen.getByText("Bài tập 2")).toBeInTheDocument();
  });

  it("GradebookCell render điểm đã chấm hoặc gạch ngang nếu chưa có điểm", () => {
    const { rerender } = render(
      <GradebookCell
        evaluation={{ id: "eval-1", score: 9, status: "returned" }}
        maxScore={10}
      />,
    );
    expect(screen.getByText("9/10")).toBeInTheDocument();
    expect(screen.getByText("returned")).toBeInTheDocument();

    rerender(<GradebookCell maxScore={10} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("GradebookRow render dòng thông tin sinh viên độc lập", () => {
    render(
      <table>
        <tbody>
          <GradebookRow
            student={mockGradebookData.students[0]}
            assignments={mockGradebookData.assignments}
            evaluationsByAssignment={
              mockGradebookData.evaluations["student-1"]
            }
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("SV001")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("9.5/10")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument(); // assign-2 chưa chấm
  });

  it("GradebookView kết hợp các sub-components phân rã thành bảng hoàn chỉnh", () => {
    render(
      <GradebookView
        classSectionId="class-test"
        data={mockGradebookData}
      />,
    );

    expect(screen.getByText("SV001")).toBeInTheDocument();
    expect(screen.getByText("SV002")).toBeInTheDocument();
    expect(screen.getByText("85/100")).toBeInTheDocument();
    expect(screen.getByText("Sinh viên 1/1")).toBeInTheDocument();
    expect(screen.getByText("Bài tập 1/1")).toBeInTheDocument();
  });

  it.each([
    [
      "không có sinh viên hoặc bài tập",
      { students: 0, assignments: 0 },
      "Chưa có dữ liệu bảng điểm",
    ],
    ["không có sinh viên", { students: 0, assignments: 2 }, "Chưa có sinh viên"],
    ["không có bài tập", { students: 2, assignments: 0 }, "Chưa có bài tập"],
  ])("hiện empty state khi lớp %s", (_label, totals, title) => {
    const data: GradebookDto = {
      students: totals.students ? mockGradebookData.students : [],
      assignments: totals.assignments ? mockGradebookData.assignments : [],
      evaluations: {},
      meta: {
        students: { page: 1, pageSize: 20, total: totals.students },
        assignments: { page: 1, pageSize: 20, total: totals.assignments },
      },
    };

    render(<GradebookView classSectionId="empty-class" data={data} />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sinh viên 1\/1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bài tập 1\/1/)).not.toBeInTheDocument();
  });
});
