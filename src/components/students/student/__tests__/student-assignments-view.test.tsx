import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentAssignmentsView } from "../student-assignments-view";
import type { StudentProfileAssignmentDto } from "@/types/student-profile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

const mockAssignments: StudentProfileAssignmentDto[] = Array.from(
  { length: 14 },
  (_, i) => ({
    id: `assign-${i + 1}`,
    classSectionId: "class-1",
    title: `Bài tập số ${i + 1}: ${i % 2 === 0 ? "SQL Query" : "React Component"}`,
    description: `Mô tả bài tập ${i + 1}`,
    assignedDate: "2026-09-01T08:00:00.000Z",
    dueDate:
      i === 0
        ? "2026-01-01T00:00:00.000Z" // Quá hạn
        : "2026-12-31T23:59:59.000Z", // Còn hạn
    status: "published",
    maxScore: 10,
    createdAt: `2026-09-${String(i + 1).padStart(2, "0")}T08:00:00.000Z`,
    updatedAt: `2026-09-${String(i + 1).padStart(2, "0")}T08:00:00.000Z`,
    evaluation:
      i === 2
        ? {
            id: `eval-${i}`,
            assignmentId: `assign-${i + 1}`,
            studentId: "student-1",
            score: 9.5,
            feedback: "Tốt",
            status: "returned",
            createdAt: "2026-09-05T00:00:00.000Z",
            updatedAt: "2026-09-05T00:00:00.000Z",
          }
        : null,
    attachments: [],
    submission: {
      latestAttempt:
        i === 1 || i === 2
          ? {
              id: `sub-${i}`,
              attemptNumber: 1,
              submittedAt: "2026-09-04T00:00:00.000Z",
              isLate: false,
              files: [],
            }
          : null,
      attemptCount: i === 1 || i === 2 ? 1 : 0,
    },
  }),
);

describe("StudentAssignmentsView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("hiển thị mặc định 6 bài tập trên trang 1 và phân trang chính xác", () => {
    const onSelect = vi.fn();
    render(
      <StudentAssignmentsView
        assignments={mockAssignments}
        onSelectAssignment={onSelect}
        defaultPageSize={6}
      />,
    );

    // Kiểm tra số bài trên trang 1
    const buttons = screen.getAllByRole("button", {
      name: /Xem chi tiết bài tập/i,
    });
    expect(buttons).toHaveLength(6);

    // Kiểm tra tổng số bài tập 14 (ở tab badge và pagination summary)
    expect(screen.getAllByText("14")).toHaveLength(2);
  });

  it("lọc theo từ khóa tìm kiếm", () => {
    const onSelect = vi.fn();
    render(
      <StudentAssignmentsView
        assignments={mockAssignments}
        onSelectAssignment={onSelect}
        defaultPageSize={6}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      /Tìm theo tên hoặc mô tả bài tập…/i,
    );
    fireEvent.change(searchInput, { target: { value: "SQL Query" } });

    // Các bài có "SQL Query" (index chẵn: 0, 2, 4, 6, 8, 10, 12 => tổng 7 bài)
    // Trang 1 sẽ có 6 bài khớp
    const buttons = screen.getAllByRole("button", {
      name: /Xem chi tiết bài tập/i,
    });
    expect(buttons).toHaveLength(6);
  });

  it("gọi onSelectAssignment khi bấm vào hàng bài tập", () => {
    const onSelect = vi.fn();
    render(
      <StudentAssignmentsView
        assignments={mockAssignments}
        onSelectAssignment={onSelect}
        defaultPageSize={6}
      />,
    );

    const items = screen.getAllByRole("button", {
      name: /Xem chi tiết bài tập/i,
    });
    fireEvent.click(items[0]);

    expect(onSelect).toHaveBeenCalledOnce();
  });
});
