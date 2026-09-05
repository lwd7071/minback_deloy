"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { AssignmentDto, AssignmentStatus } from "@/types/assignment";
import { AssignmentDetailView } from "./assignment-detail-view";

function toDatetimeLocal(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

type StatusFilter = "all" | AssignmentStatus;

export function ClassAssignmentsView({
  classSectionId,
  initialAssignments,
}: {
  classSectionId: string;
  initialAssignments: AssignmentDto[];
}) {
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

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/teacher/class-sections/${classSectionId}/assignments`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data)
          throw new Error(body.error?.message ?? "Không thể tải bài tập");
        return body.data as AssignmentDto[];
      })
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải bài tập",
          );
      });
    return () => {
      active = false;
    };
  }, [classSectionId, refreshKey]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/assignments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            description: "",
            assignedDate: toDatetimeLocal(new Date()),
            dueDate: toDatetimeLocal(new Date()),
            status: "published",
            maxScore: 10,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.data)
        throw new Error(body.error?.message ?? "Không thể tạo bài tập");

      const created = body.data as AssignmentDto;
      // Đưa bài tập mới tạo lên vị trí đầu tiên
      setRows((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setShowCreate(false);
      setDraft({
        title: "",
      });
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tạo bài tập",
      );
    } finally {
      setBusy(false);
    }
  }

  // Đếm số lượng theo trạng thái
  const counts = useMemo(() => {
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
            onSubmit={(event) => void create(event)}
            autoComplete="off"
          >
            <label className="form-field">
              <span className="form-label">Tên bài tập</span>
              <input
                className="form-input"
                required
                autoComplete="off"
                value={draft.title}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, title: event.target.value }))
                }
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
            onSaved={(updated) => {
              setRows((prev) =>
                prev.map((row) => (row.id === updated.id ? updated : row)),
              );
            }}
            onDeleted={() => {
              setRows((prev) =>
                prev.filter((row) => row.id !== selectedAssignmentId),
              );
              setSelectedAssignmentId(null);
            }}
            onClose={() => setSelectedAssignmentId(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
