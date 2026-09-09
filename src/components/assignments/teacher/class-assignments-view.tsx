"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { AssignmentDto } from "@/types/assignment";
import { AssignmentDetailView } from "./assignment-detail-view";
import { useClassAssignments } from "./use-class-assignments";

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
    counts,
    statusFilter,
    setStatusFilter,
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
  } = useClassAssignments({ classSectionId, initialAssignments });

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

      {/* Bộ lọc Tabs: Tất cả / Đã phát hành / Bản nháp / Đã đóng */}
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

      {/* Danh sách bài tập */}
      <div className="grid">
        {filteredRows.map((row) => {
          return (
            <Card hover className="stack" key={row.id}>
              <div className="split">
                <Badge variant={row.status}>{row.status}</Badge>
              </div>
              <h3>{row.title}</h3>
              <div className="cluster">
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
            <p className="muted">
              {statusFilter === "all"
                ? "Chưa có bài tập nào trong lớp."
                : statusFilter === "published"
                  ? "Không có bài tập nào đã phát hành."
                  : statusFilter === "draft"
                    ? "Không có bài tập nháp nào."
                    : "Không có bài tập nào đã đóng."}
            </p>
          </Card>
        ) : null}
      </div>

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
