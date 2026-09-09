import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssignmentDto } from "@/types/assignment";
import { useClassAssignments } from "../use-class-assignments";

const mockAssignments: AssignmentDto[] = [
  {
    id: "assign-1",
    classSectionId: "class-1",
    title: "Bài tập 1 - Published",
    description: "Mô tả 1",
    assignedDate: "2026-09-01T08:00:00.000Z",
    dueDate: "2026-09-10T23:59:59.000Z",
    status: "published",
    maxScore: 10,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "assign-2",
    classSectionId: "class-1",
    title: "Bài tập 2 - Draft",
    description: "Mô tả 2",
    assignedDate: "2026-09-02T08:00:00.000Z",
    dueDate: "2026-09-15T23:59:59.000Z",
    status: "draft",
    maxScore: 10,
    createdAt: "2026-09-02T08:00:00.000Z",
    updatedAt: "2026-09-02T08:00:00.000Z",
  },
  {
    id: "assign-3",
    classSectionId: "class-1",
    title: "Bài tập 3 - Closed",
    description: "Mô tả 3",
    assignedDate: "2026-08-01T08:00:00.000Z",
    dueDate: "2026-08-10T23:59:59.000Z",
    status: "closed",
    maxScore: 10,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
  },
];

describe("useClassAssignments Custom Hook (SRP & UI State Isolation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("khởi tạo danh sách bài tập và đếm số lượng chính xác", () => {
    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: mockAssignments,
      }),
    );

    expect(result.current.rows).toHaveLength(3);
    expect(result.current.filteredRows).toHaveLength(3);
    expect(result.current.counts).toEqual({
      all: 3,
      published: 1,
      draft: 1,
      closed: 1,
    });
    expect(result.current.statusFilter).toBe("all");
    expect(result.current.showCreate).toBe(false);
  });

  it("lọc danh sách bài tập theo statusFilter", () => {
    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: mockAssignments,
      }),
    );

    act(() => {
      result.current.setStatusFilter("published");
    });
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0].id).toBe("assign-1");

    act(() => {
      result.current.setStatusFilter("draft");
    });
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0].id).toBe("assign-2");

    act(() => {
      result.current.setStatusFilter("closed");
    });
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0].id).toBe("assign-3");
  });

  it("quản lý cập nhật (saved) và xóa (deleted) bài tập", () => {
    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: mockAssignments,
      }),
    );

    act(() => {
      result.current.setSelectedAssignmentId("assign-2");
    });
    expect(result.current.selectedAssignment?.id).toBe("assign-2");

    // Giả lập lưu bài tập đã sửa
    act(() => {
      result.current.handleAssignmentSaved({
        ...mockAssignments[1],
        title: "Bài tập 2 - Đã cập nhật",
        status: "published",
      });
    });

    const updated = result.current.rows.find((r) => r.id === "assign-2");
    expect(updated?.title).toBe("Bài tập 2 - Đã cập nhật");
    expect(updated?.status).toBe("published");
    expect(result.current.counts.published).toBe(2);

    // Giả lập xóa bài tập
    act(() => {
      result.current.handleAssignmentDeleted("assign-2");
    });
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.selectedAssignmentId).toBeNull();
  });

  it("xử lý tạo bài tập thành công và prepend vào đầu danh sách", async () => {
    const newAssignment: AssignmentDto = {
      id: "assign-new",
      classSectionId: "class-1",
      title: "Bài tập mới tạo",
      description: "",
      assignedDate: "2026-09-09T00:00:00.000Z",
      dueDate: "2026-09-16T23:59:59.000Z",
      status: "published",
      maxScore: 10,
      createdAt: "2026-09-09T00:00:00.000Z",
      updatedAt: "2026-09-09T00:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: newAssignment }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [newAssignment, ...mockAssignments] }),
      });
    });

    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: mockAssignments,
      }),
    );

    act(() => {
      result.current.setShowCreate(true);
      result.current.setDraftTitle("Bài tập mới tạo");
    });

    let success = false;
    await act(async () => {
      success = await result.current.createAssignment();
    });

    expect(success).toBe(true);
    expect(result.current.rows[0].id).toBe("assign-new");
    expect(result.current.showCreate).toBe(false);
    expect(result.current.draft.title).toBe("");
  });
});
