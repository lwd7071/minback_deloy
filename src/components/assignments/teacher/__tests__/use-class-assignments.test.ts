import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeacherAssignmentSummaryDto } from "@/types/assignment";
import { useClassAssignments } from "../use-class-assignments";

const summary = (
  id: string,
  title: string,
  state: "empty" | "incomplete" | "complete",
): TeacherAssignmentSummaryDto => ({
  id,
  classSectionId: "class-1",
  title,
  description: "",
  assignedDate: "2026-09-01T08:00:00.000Z",
  dueDate: "2026-09-10T23:59:59.000Z",
  status: "published",
  maxScore: 10,
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
  gradingSummary: {
    totalStudents: state === "empty" ? 0 : 2,
    gradedCount: state === "complete" ? 1 : 0,
    returnedCount: state === "complete" ? 1 : 0,
    evaluatedCount: state === "complete" ? 2 : 0,
    percentage: state === "complete" ? 100 : 0,
    state,
  },
});

const rows = [
  summary("assign-1", "Bài tập chưa chấm", "incomplete"),
  summary("assign-2", "Bài tập đã chấm", "complete"),
  summary("assign-3", "Bài tập rỗng", "empty"),
];

describe("useClassAssignments", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("counts and filters by grading progress", () => {
    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: rows,
      }),
    );

    expect(result.current.counts).toEqual({
      all: 3,
      incomplete: 1,
      complete: 1,
    });
    act(() => result.current.setGradingFilter("complete"));
    expect(result.current.filteredRows.map((row) => row.id)).toEqual([
      "assign-2",
    ]);
    act(() => result.current.setGradingFilter("incomplete"));
    expect(result.current.filteredRows.map((row) => row.id)).toEqual([
      "assign-1",
    ]);
  });

  it("searches title only and supports stable title sorting", () => {
    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: rows,
      }),
    );
    act(() => result.current.setSearchKeyword("đã chấm"));
    expect(result.current.filteredRows.map((row) => row.id)).toEqual([
      "assign-2",
    ]);
    act(() => {
      result.current.setSearchKeyword("");
      result.current.setSortBy("title_asc");
    });
    expect(result.current.filteredRows.map((row) => row.title)).toEqual(
      ["Bài tập chưa chấm", "Bài tập đã chấm", "Bài tập rỗng"].sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    );
  });

  it("resets the active controls without deadline state", () => {
    const { result } = renderHook(() =>
      useClassAssignments({
        classSectionId: "class-1",
        initialAssignments: rows,
      }),
    );
    act(() => {
      result.current.setSearchKeyword("x");
      result.current.setGradingFilter("complete");
      result.current.setSortBy("title_asc");
      result.current.resetFilters();
    });
    expect(result.current.searchKeyword).toBe("");
    expect(result.current.gradingFilter).toBe("all");
    expect(result.current.sortBy).toBe("newest");
    expect(result.current.page).toBe(1);
  });
});
