import { cleanup, render, screen } from "@testing-library/react";
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
});
