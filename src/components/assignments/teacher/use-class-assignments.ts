"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssignmentDto, AssignmentStatus } from "@/types/assignment";

function toDatetimeLocal(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export type StatusFilter = "all" | AssignmentStatus;

export interface AssignmentCounts {
  all: number;
  published: number;
  draft: number;
  closed: number;
}

export interface UseClassAssignmentsOptions {
  classSectionId: string;
  initialAssignments: AssignmentDto[];
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
}: UseClassAssignmentsOptions) {
  const [rows, setRows] = useState<AssignmentDto[]>(initialAssignments);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [draft, setDraft] = useState({
    title: "",
  });

  const [prevInitialAssignments, setPrevInitialAssignments] =
    useState(initialAssignments);
  if (initialAssignments !== prevInitialAssignments) {
    setPrevInitialAssignments(initialAssignments);
    setRows(initialAssignments);
  }

  // Chỉ fetch dữ liệu qua API client khi có thao tác mutation (refreshKey > 0)
  // để bảo toàn lợi thế tốc độ của Server Component rendering ban đầu
  useEffect(() => {
    if (refreshKey === 0) return;

    let active = true;
    void fetch(`/api/v1/teacher/class-sections/${classSectionId}/assignments`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data) {
          throw new Error(body.error?.message ?? "Không thể tải bài tập");
        }
        return body.data as AssignmentDto[];
      })
      .then((data) => {
        if (active && Array.isArray(data)) setRows(data);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Không thể tải bài tập",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [classSectionId, refreshKey]);

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

      const created = body.data as AssignmentDto;
      // Prepend bài tập mới lên đầu danh sách
      setRows((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setShowCreate(false);
      setDraft({ title: "" });
      setRefreshKey((value) => value + 1);
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
    setRows((prev) =>
      prev.map((row) => (row.id === updated.id ? updated : row)),
    );
  };

  // Xóa bài tập khỏi danh sách
  const handleAssignmentDeleted = (deletedId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== deletedId));
    if (selectedAssignmentId === deletedId) {
      setSelectedAssignmentId(null);
    }
  };

  // Tính toán số lượng bài tập theo trạng thái
  const counts = useMemo<AssignmentCounts>(() => {
    const published = rows.filter((r) => r.status === "published").length;
    const draftCount = rows.filter((r) => r.status === "draft").length;
    const closed = rows.filter((r) => r.status === "closed").length;
    return { all: rows.length, published, draft: draftCount, closed };
  }, [rows]);

  // Lọc danh sách hiển thị
  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  // Chi tiết bài tập đang chọn chỉnh sửa
  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null;
    return rows.find((r) => r.id === selectedAssignmentId) ?? null;
  }, [rows, selectedAssignmentId]);

  return {
    rows,
    filteredRows,
    counts,
    statusFilter,
    setStatusFilter,
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
    handleAssignmentDeleted,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
