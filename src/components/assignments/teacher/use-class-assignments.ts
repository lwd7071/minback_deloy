"use client";

import { useMemo, useState } from "react";
import type {
  AssignmentDto,
  TeacherAssignmentSummaryDto,
} from "@/types/assignment";

function toDatetimeLocal(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export type GradingFilter = "all" | "incomplete" | "complete";
export type SortOption = "newest" | "title_asc";

export interface AssignmentCounts {
  all: number;
  incomplete: number;
  complete: number;
}

export interface UseClassAssignmentsOptions {
  classSectionId: string;
  initialAssignments: TeacherAssignmentSummaryDto[];
  defaultPageSize?: number;
}

/**
 * Custom Hook quản lý toàn bộ Data Lifecycle, Mutation, Filter và Modal State
 * cho màn hình danh sách bài tập của lớp học phần (Teacher Workspace).
 *
 * Tuân thủ Single Responsibility Principle (SRP):
 * - Tách rời logic xử lý dữ liệu và mutation ra khỏi Presentational UI.
 * - Cho phép kiểm thử logic (Unit Test) độc lập mà không cần render UI tree phức tạp.
 */
export function useClassAssignments({
  classSectionId,
  initialAssignments,
  defaultPageSize = 6,
}: UseClassAssignmentsOptions) {
  const [rows, setRows] =
    useState<TeacherAssignmentSummaryDto[]>(initialAssignments);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [gradingFilter, setGradingFilterState] = useState<GradingFilter>("all");
  const [searchKeyword, setSearchKeywordState] = useState("");
  const [sortBy, setSortByState] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [draft, setDraft] = useState({
    title: "",
  });

  const [prevInitialAssignments, setPrevInitialAssignments] =
    useState(initialAssignments);
  if (initialAssignments !== prevInitialAssignments) {
    setPrevInitialAssignments(initialAssignments);
    setRows(initialAssignments);
  }

  // Tạo bài tập mới
  async function createAssignment(event?: React.FormEvent): Promise<boolean> {
    if (event) event.preventDefault();
    if (!draft.title.trim()) return false;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/assignments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: draft.title.trim(),
            description: "",
            assignedDate: toDatetimeLocal(new Date()),
            dueDate: toDatetimeLocal(new Date()),
            status: "published",
            maxScore: 10,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Không thể tạo bài tập");
      }

      setShowCreate(false);
      setDraft({ title: "" });
      const created = body.data as TeacherAssignmentSummaryDto;
      const createdSummary = created.gradingSummary ?? {
        totalStudents: 0,
        gradedCount: 0,
        returnedCount: 0,
        evaluatedCount: 0,
        percentage: 0,
        state: "empty" as const,
      };
      setRows((current) => [
        { ...created, gradingSummary: createdSummary },
        ...current,
      ]);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tạo bài tập",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Cập nhật bài tập đã sửa vào state
  const handleAssignmentSaved = (updated: AssignmentDto) => {
    setRows((current) =>
      current.map((row) =>
        row.id === updated.id ? { ...row, ...updated } : row,
      ),
    );
  };

  // Setters kèm reset về trang 1
  const setGradingFilter = (st: GradingFilter) => {
    setGradingFilterState(st);
    setPage(1);
  };

  const setSearchKeyword = (kw: string) => {
    setSearchKeywordState(kw);
    setPage(1);
  };

  const setSortBy = (sb: SortOption) => {
    setSortByState(sb);
    setPage(1);
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchKeywordState("");
    setGradingFilterState("all");
    setSortByState("newest");
    setPage(1);
  };

  // Tính toán số lượng bài tập theo trạng thái
  const counts = useMemo<AssignmentCounts>(() => {
    const incomplete = rows.filter(
      (row) => row.gradingSummary.state === "incomplete",
    ).length;
    const complete = rows.filter(
      (row) => row.gradingSummary.state === "complete",
    ).length;
    return { all: rows.length, incomplete, complete };
  }, [rows]);

  // Lọc và sắp xếp danh sách hiển thị
  const filteredRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (
          gradingFilter !== "all" &&
          row.gradingSummary.state !== gradingFilter
        ) {
          return false;
        }

        if (keyword) {
          if (!row.title.toLowerCase().includes(keyword)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title_asc") {
          return a.title.localeCompare(b.title, "vi");
        }
        // Mặc định "newest": tạo mới nhất lên đầu
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [rows, gradingFilter, searchKeyword, sortBy]);

  // Phân trang danh sách đã lọc
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  // Chi tiết bài tập đang chọn chỉnh sửa
  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null;
    return rows.find((r) => r.id === selectedAssignmentId) ?? null;
  }, [rows, selectedAssignmentId]);

  return {
    rows,
    filteredRows,
    paginatedRows,
    counts,
    gradingFilter,
    setGradingFilter,
    searchKeyword,
    setSearchKeyword,
    sortBy,
    setSortBy,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    resetFilters,
    error,
    clearError: () => setError(null),
    showCreate,
    setShowCreate,
    busy,
    draft,
    setDraftTitle: (title: string) => setDraft({ title }),
    createAssignment,
    selectedAssignmentId,
    setSelectedAssignmentId,
    selectedAssignment,
    handleAssignmentSaved,
    refresh: () => undefined,
  };
}
