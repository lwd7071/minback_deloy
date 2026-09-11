"use client";

import Link from "next/link";
import { Clock, RotateCcw, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import type { AssignmentDto } from "@/types/assignment";
import { AssignmentDetailView } from "./assignment-detail-view";
import {
  useClassAssignments,
  type DueDateFilter,
  type SortOption,
} from "./use-class-assignments";

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

/**
 * Presentational Component cho màn hình quản lý bài tập của lớp học phần.
 *
 * Tuân thủ Single Responsibility Principle (SRP):
 * - View chỉ đảm nhận duy nhất việc biểu diễn giao diện người dùng (Presentational View).
 * - Toàn bộ state management, network calls, validation và modal lifecycle
 *   được ủy nhiệm cho hook `useClassAssignments`.
 */
export function ClassAssignmentsView({
  classSectionId,
  initialAssignments,
}: {
  classSectionId: string;
  initialAssignments: AssignmentDto[];
}) {
  const {
    rows,
    filteredRows,
    paginatedRows,
    counts,
    statusFilter,
    setStatusFilter,
    searchKeyword,
    setSearchKeyword,
    dueDateFilter,
    setDueDateFilter,
    sortBy,
    setSortBy,
    page,
    setPage,
    pageSize,
    setPageSize,
    resetFilters,
    referenceTime,
    error,
    showCreate,
    setShowCreate,
    busy,
    draft,
    setDraftTitle,
    createAssignment,
    selectedAssignmentId,
    setSelectedAssignmentId,
    handleAssignmentSaved,
    handleAssignmentDeleted,
  } = useClassAssignments({
    classSectionId,
    initialAssignments,
    defaultPageSize: 6,
  });

  const hasActiveFilters = Boolean(
    searchKeyword ||
      statusFilter !== "all" ||
      dueDateFilter !== "all" ||
      sortBy !== "newest",
  );

  return (
    <div className="stack">
      {error ? <p className="form-error">{error}</p> : null}
      <div className="split">
        <div>
          <h2>Bài tập ({rows.length})</h2>
          <p className="muted">Tạo, phát hành và chấm bài trong lớp này.</p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "Đóng form" : "+ Tạo bài tập mới"}
        </Button>
      </div>

      {/* Form Tạo bài tập mới */}
      {showCreate ? (
        <Card>
          <form
            className="form-stack"
            onSubmit={(event) => void createAssignment(event)}
            autoComplete="off"
          >
            <label className="form-field">
              <span className="form-label">Tên bài tập</span>
              <input
                className="form-input"
                required
                autoComplete="off"
                value={draft.title}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                Hủy
              </button>
              <Button loading={busy}>Tạo bài tập</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Thanh hàng trên: Tabs trạng thái bên trái & Bộ lọc / Sắp xếp ngang hàng bên phải */}
      <div className="assignment-toolbar-header">
        <div
          className="assignment-status-tabs"
          role="tablist"
          aria-label="Lọc bài tập theo trạng thái"
        >
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "all"}
            className={`assignment-tab-btn ${statusFilter === "all" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả <span className="tab-count-badge">{counts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "published"}
            className={`assignment-tab-btn ${statusFilter === "published" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("published")}
          >
            Đã phát hành{" "}
            <span className="tab-count-badge">{counts.published}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "draft"}
            className={`assignment-tab-btn ${statusFilter === "draft" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("draft")}
          >
            Bản nháp <span className="tab-count-badge">{counts.draft}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "closed"}
            className={`assignment-tab-btn ${statusFilter === "closed" ? "is-active" : ""}`}
            onClick={() => setStatusFilter("closed")}
          >
            Đã đóng <span className="tab-count-badge">{counts.closed}</span>
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
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value as DueDateFilter)}
            aria-label="Lọc theo hạn nộp"
          >
            <option value="all">Tất cả hạn nộp</option>
            <option value="active">Còn hạn nộp</option>
            <option value="overdue">Đã quá hạn</option>
          </select>

          <select
            className="assignment-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
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

      {/* Danh sách bài tập phân trang dạng hàng ngang gọn gàng */}
      <div className="assignment-list-horizontal">
        {paginatedRows.map((row) => {
          return (
            <Card hover className="assignment-row-card" key={row.id}>
              <div className="assignment-row-left">
                <Badge variant={row.status}>{row.status}</Badge>
                <h3 className="assignment-row-title" title={row.title}>
                  {row.title}
                </h3>
              </div>

              <div className="assignment-row-meta">
                <div className="assignment-card-meta-item">
                  <Clock size={13} aria-hidden="true" />
                  <span>Hạn: {formatDueDate(row.dueDate)}</span>
                </div>
                {row.dueDate ? (
                  isOverdue(row.dueDate, referenceTime) ? (
                    <span className="assignment-overdue-tag">Quá hạn</span>
                  ) : (
                    <span className="assignment-active-tag">Còn hạn</span>
                  )
                ) : null}
                <div className="assignment-row-score">
                  <span>
                    Thang: <strong>{row.maxScore}đ</strong>
                  </span>
                </div>
              </div>

              <div className="assignment-row-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedAssignmentId(row.id)}
                >
                  Chỉnh sửa
                </button>
                <Link
                  className="btn btn-primary"
                  href={`/admin/classes/${classSectionId}/assignments/${row.id}/grade`}
                >
                  Nhập điểm & feedback
                </Link>
              </div>
            </Card>
          );
        })}

        {!filteredRows.length ? (
          <Card>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p
                className="muted"
                style={{ marginBottom: hasActiveFilters ? "12px" : 0 }}
              >
                {rows.length === 0
                  ? "Chưa có bài tập nào trong lớp."
                  : "Không tìm thấy bài tập nào phù hợp với bộ lọc hiện tại."}
              </p>
              {rows.length > 0 && hasActiveFilters ? (
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
          </Card>
        ) : null}
      </div>

      {/* Phân trang (Pagination) */}
      {filteredRows.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[6, 12, 24]}
          itemLabel="bài tập"
        />
      )}

      {/* Modal Chỉnh sửa bài tập */}
      <Modal
        open={Boolean(selectedAssignmentId)}
        onClose={() => {
          setSelectedAssignmentId(null);
        }}
        title="Chỉnh sửa bài tập"
        size="lg"
      >
        {selectedAssignmentId ? (
          <AssignmentDetailView
            assignmentId={selectedAssignmentId}
            onSaved={handleAssignmentSaved}
            onDeleted={() => {
              handleAssignmentDeleted(selectedAssignmentId);
            }}
            onClose={() => setSelectedAssignmentId(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
