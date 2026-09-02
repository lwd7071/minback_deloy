"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatDeadlineInfo } from "@/lib/deadline-utils";
import type { AssignmentDto } from "@/types/assignment";
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

function getDefaultDueDate(
  daysAhead: number = 7,
  hours: number = 23,
  minutes: number = 59,
): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, minutes, 0, 0);
  return toDatetimeLocal(d);
}

export function ClassAssignmentsView({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const [rows, setRows] = useState<AssignmentDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    assignedDate: toDatetimeLocal(new Date()),
    dueDate: getDefaultDueDate(7, 23, 59),
    maxScore: "10",
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
            ...draft,
            maxScore: Number(draft.maxScore),
          }),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.data)
        throw new Error(body.error?.message ?? "Không thể tạo bài tập");
      setShowCreate(false);
      setDraft({
        title: "",
        description: "",
        assignedDate: toDatetimeLocal(new Date()),
        dueDate: getDefaultDueDate(7, 23, 59),
        maxScore: "10",
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

  function setPresetTime(hours: number, minutes: number) {
    setDraft((prev) => {
      const baseDate = prev.dueDate ? new Date(prev.dueDate) : new Date();
      if (Number.isNaN(baseDate.getTime())) return prev;
      baseDate.setHours(hours, minutes, 0, 0);
      return { ...prev, dueDate: toDatetimeLocal(baseDate) };
    });
  }

  return (
    <div className="stack">
      {error ? <p className="form-error">{error}</p> : null}
      <div className="split">
        <div>
          <h2>Bài tập</h2>
          <p className="muted">Tạo, phát hành và chấm bài trong lớp này.</p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "Đóng form" : "+ Tạo bài tập"}
        </Button>
      </div>

      {showCreate ? (
        <Card>
          <form className="form-stack" onSubmit={(event) => void create(event)} autoComplete="off">
            <label className="form-field">
              <span>Tên bài tập</span>
              <input
                required
                autoComplete="off"
                value={draft.title}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, title: event.target.value }))
                }
              />
            </label>

            <label className="form-field">
              <span>Mô tả</span>
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
              />
            </label>

            <div className="grid">
              <label className="form-field">
                <span>Ngày giao</span>
                <input
                  required
                  type="datetime-local"
                  value={draft.assignedDate}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      assignedDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="form-field">
                <span>Hạn nộp</span>
                <input
                  required
                  type="datetime-local"
                  value={draft.dueDate}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="form-field">
                <span>Điểm tối đa</span>
                <input
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={draft.maxScore}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      maxScore: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                Hủy
              </button>
              <Button loading={busy}>Tạo bản nháp bài tập</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid">
        {rows.map((row) => {
          const deadline = formatDeadlineInfo(row.dueDate);
          return (
            <Card hover className="stack" key={row.id}>
              <div className="split">
                <Badge variant={row.status}>{row.status}</Badge>
                <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  Hạn: <strong style={{ color: "var(--navy-900)" }}>{deadline.formattedShort}</strong>
                </span>
              </div>
              <h3>{row.title}</h3>
              <p className="muted">{row.description || "Chưa có mô tả."}</p>
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
                  Chấm bài
                </Link>
              </div>
            </Card>
          );
        })}
        {!rows.length ? (
          <Card>
            <p className="muted">Chưa có bài tập trong lớp.</p>
          </Card>
        ) : null}
      </div>

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
