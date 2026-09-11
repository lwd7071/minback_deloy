"use client";

import { useMemo, useState } from "react";
import { Clock, RotateCcw, Search, X } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import type { StudentProfileAssignmentDto } from "@/types/student-profile";

export type StudentAssignmentStatusTab =
  | "all"
  | "pending"
  | "submitted"
  | "graded"
  | "overdue";

export type StudentSortOption = "newest" | "due_asc" | "due_desc" | "title_asc";

function formatDueDate(dueDateStr: string): string {
  try {
    const d = new Date(dueDateStr);
    if (Number.isNaN(d.getTime())) return dueDateStr;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return dueDateStr;
  }
}

function isOverdue(dueDateStr: string, referenceTime: number): boolean {
  try {
    return new Date(dueDateStr).getTime() < referenceTime;
  } catch {
    return false;
  }
}

export interface StudentAssignmentsViewProps {
  assignments: StudentProfileAssignmentDto[];
  onSelectAssignment: (id: string) => void;
  defaultPageSize?: number;
}

export function StudentAssignmentsView({
  assignments,
  onSelectAssignment,
  defaultPageSize = 6,
}: StudentAssignmentsViewProps) {
  const [statusTab, setStatusTabState] =
    useState<StudentAssignmentStatusTab>("all");
  const [searchKeyword, setSearchKeywordState] = useState("");
  const [sortBy, setSortByState] = useState<StudentSortOption>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [referenceTime, setReferenceTime] = useState(() => Date.now());

  const setStatusTab = (tab: StudentAssignmentStatusTab) => {
    setStatusTabState(tab);
    setReferenceTime(Date.now());
    setPage(1);
  };

  const setSearchKeyword = (keyword: string) => {
    setSearchKeywordState(keyword);
    setPage(1);
  };

  const setSortBy = (sort: StudentSortOption) => {
    setSortByState(sort);
    setPage(1);
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const resetFilters = () => {
    setStatusTabState("all");
    setSearchKeywordState("");
    setSortByState("newest");
    setReferenceTime(Date.now());
    setPage(1);
  };

  // Tính số lượng bài tập theo từng tab
  const counts = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let graded = 0;
    let overdue = 0;

    for (const a of assignments) {
      const isSub = Boolean(a.submission?.latestAttempt);
      const isGrd = a.evaluation?.status === "returned";
      const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const isPast = dueTime < referenceTime;

      if (isGrd) graded++;
      if (isSub) submitted++;
      if (!isSub && !isPast) pending++;
      if (!isSub && isPast) overdue++;
    }

    return {
      all: assignments.length,
      pending,
      submitted,
      graded,
      overdue,
    };
  }, [assignments, referenceTime]);

  // Lọc và sắp xếp
  const filteredRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return assignments
      .filter((a) => {
        const isSub = Boolean(a.submission?.latestAttempt);
        const isGrd = a.evaluation?.status === "returned";
        const dueTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const isPast = dueTime < referenceTime;

        // Lọc theo Tab trạng thái
        if (statusTab === "pending" && (isSub || isPast)) return false;
        if (statusTab === "submitted" && !isSub) return false;
        if (statusTab === "graded" && !isGrd) return false;
        if (statusTab === "overdue" && (isSub || !isPast)) return false;

        // Lọc theo từ khóa tìm kiếm
        if (keyword) {
          const titleMatch = a.title.toLowerCase().includes(keyword);
          const descMatch = a.description?.toLowerCase().includes(keyword);
          if (!titleMatch && !descMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "due_asc") {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "due_desc") {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sortBy === "title_asc") {
          return a.title.localeCompare(b.title, "vi");
        }
        // "newest"
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [assignments, statusTab, searchKeyword, sortBy, referenceTime]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const hasActiveFilters = Boolean(
    searchKeyword || statusTab !== "all" || sortBy !== "newest",
  );

  return (
    <div className="student-assignments-container">
      {/* Thanh hàng trên: Tabs trạng thái bên trái & Bộ lọc / Sắp xếp ngang hàng bên phải */}
      <div className="assignment-toolbar-header">
        <div
          className="assignment-status-tabs"
          role="tablist"
          aria-label="Lọc bài tập theo trạng thái làm bài"
        >
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === "all"}
            className={`assignment-tab-btn ${statusTab === "all" ? "is-active" : ""}`}
            onClick={() => setStatusTab("all")}
          >
            Tất cả <span className="tab-count-badge">{counts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === "pending"}
            className={`assignment-tab-btn ${statusTab === "pending" ? "is-active" : ""}`}
            onClick={() => setStatusTab("pending")}
          >
            Chưa nộp <span className="tab-count-badge">{counts.pending}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === "submitted"}
            className={`assignment-tab-btn ${statusTab === "submitted" ? "is-active" : ""}`}
            onClick={() => setStatusTab("submitted")}
          >
            Đã nộp <span className="tab-count-badge">{counts.submitted}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === "graded"}
            className={`assignment-tab-btn ${statusTab === "graded" ? "is-active" : ""}`}
            onClick={() => setStatusTab("graded")}
          >
            Đã có điểm <span className="tab-count-badge">{counts.graded}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === "overdue"}
            className={`assignment-tab-btn ${statusTab === "overdue" ? "is-active" : ""}`}
            onClick={() => setStatusTab("overdue")}
          >
            Quá hạn <span className="tab-count-badge">{counts.overdue}</span>
          </button>
        </div>

        <div className="assignment-filter-group">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilters}
              title="Khôi phục bộ lọc mặc định"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                height: "40px",
                padding: "0 12px",
              }}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Đặt lại
            </button>
          )}

          <select
            className="assignment-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as StudentSortOption)}
            aria-label="Sắp xếp bài tập"
          >
            <option value="newest">Mới tạo nhất</option>
            <option value="due_asc">Hạn nộp gần nhất</option>
            <option value="due_desc">Hạn nộp xa nhất</option>
            <option value="title_asc">Tên A → Z</option>
          </select>
        </div>
      </div>

      {/* Hàng dưới: Ô tìm kiếm nằm bên phải, ở dưới phần bộ lọc */}
      <div className="assignment-search-row">
        <div className="assignment-search-box">
          <Search
            size={16}
            className="assignment-search-icon"
            aria-hidden="true"
          />
          <input
            type="text"
            className="assignment-search-input"
            placeholder="Tìm theo tên hoặc mô tả bài tập…"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            autoComplete="off"
          />
          {searchKeyword ? (
            <button
              type="button"
              className="assignment-search-clear"
              onClick={() => setSearchKeyword("")}
              aria-label="Xóa tìm kiếm"
              title="Xóa từ khóa tìm kiếm"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Danh sách bài tập dạng hàng ngang */}
      <div className="assignment-list-horizontal" style={{ marginTop: "12px" }}>
        {paginatedRows.map((assignment) => {
          const isSub = Boolean(assignment.submission?.latestAttempt);
          const isGrd = assignment.evaluation?.status === "returned";
          const isPast = isOverdue(assignment.dueDate, referenceTime);

          return (
            <button
              key={assignment.id}
              className="assignment-row-card"
              onClick={() => onSelectAssignment(assignment.id)}
              aria-label={`Xem chi tiết bài tập ${assignment.title}`}
              type="button"
              style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
            >
              <div className="assignment-row-left">
                <h3 className="assignment-row-title" title={assignment.title}>
                  {assignment.title}
                </h3>
              </div>

              <div className="assignment-row-meta">
                <div className="assignment-card-meta-item">
                  <Clock size={13} aria-hidden="true" />
                  <span>Hạn: {formatDueDate(assignment.dueDate)}</span>
                </div>
                {isPast && !isSub ? (
                  <span className="assignment-overdue-tag">Quá hạn</span>
                ) : !isPast && !isSub ? (
                  <span className="assignment-active-tag">Còn hạn</span>
                ) : null}
                <div className="assignment-row-score">
                  <span>
                    Thang: <strong>{assignment.maxScore}đ</strong>
                  </span>
                </div>
              </div>

              <div className="assignment-row-actions">
                {isGrd && assignment.evaluation?.score !== null ? (
                  <span className="workspace-status is-complete">
                    {assignment.evaluation!.score} / {assignment.maxScore} điểm
                  </span>
                ) : isSub ? (
                  <span className="workspace-status is-complete">
                    Đã nộp bài
                  </span>
                ) : (
                  <span
                    className={`workspace-status ${isPast ? "badge-danger" : "is-pending"}`}
                  >
                    {isPast ? "Quá hạn" : "Chưa nộp"}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {!filteredRows.length ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              border: "1px dashed var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <p
              className="muted"
              style={{ marginBottom: hasActiveFilters ? "12px" : 0 }}
            >
              {assignments.length === 0
                ? "Chưa có bài tập nào được giao."
                : "Không tìm thấy bài tập nào phù hợp với bộ lọc hiện tại."}
            </p>
            {assignments.length > 0 && hasActiveFilters ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetFilters}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Xóa bộ lọc
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Phân trang */}
      {filteredRows.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={filteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24]}
            itemLabel="bài tập"
          />
        </div>
      )}
    </div>
  );
}
