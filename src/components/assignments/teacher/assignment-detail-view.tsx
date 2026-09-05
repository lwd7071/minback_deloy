"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AssignmentDto, AssignmentStatus } from "@/types/assignment";
import { AttachmentUploadPanel } from "./attachment-upload-panel";

type ApiResult<T> = { data: T } | { error: { message: string } };

function apiMessage<T>(body: ApiResult<T>, fallback: string): string {
  return "error" in body ? body.error.message : fallback;
}

export function AssignmentDetailView({
  assignmentId,
  onSaved,
  onDeleted,
  onClose,
}: {
  assignmentId: string;
  onSaved?: (updated: AssignmentDto) => void;
  onDeleted?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [status, setStatus] = useState<AssignmentStatus>("draft");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toDatetimeLocal(val: string | Date): string {
    if (!val) return "";
    const d =
      typeof val === "string"
        ? new Date(val.includes("T") ? val : `${val}T23:59:00+07:00`)
        : val;
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function applyAssignment(next: AssignmentDto): void {
    setAssignment(next);
    setTitle(next.title);
    setDescription(next.description);
    setAssignedDate(toDatetimeLocal(next.assignedDate));
    setDueDate(toDatetimeLocal(next.dueDate));
    setMaxScore(String(next.maxScore));
    setStatus(next.status);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/v1/teacher/assignments/${assignmentId}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as ApiResult<AssignmentDto>;
        if (!response.ok || !("data" in body))
          throw new Error(apiMessage(body, "Không thể tải bài tập"));
        if (active) applyAssignment(body.data);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Không thể tải bài tập",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // applyAssignment only updates local form state; assignmentId is the fetch lifecycle key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  async function updateAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            assignedDate,
            dueDate,
            maxScore: Number(maxScore),
            status,
          }),
        },
      );
      const body = (await response.json()) as ApiResult<AssignmentDto>;
      if (!response.ok || !("data" in body))
        throw new Error(apiMessage(body, "Không thể cập nhật bài tập"));
      applyAssignment(body.data);
      setSuccessMsg("Đã cập nhật bài tập thành công!");
      onSaved?.(body.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể cập nhật bài tập",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteAssignment() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = (await response.json()) as ApiResult<never>;
        throw new Error(apiMessage(body, "Không thể xóa bài tập"));
      }
      if (onDeleted) {
        onDeleted();
      } else {
        router.back();
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa bài tập",
      );
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-stack" aria-live="polite">
        <p className="muted">Đang tải thông tin bài tập…</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="settings-stack">
        <p className="form-error">{error ?? "Không tìm thấy bài tập"}</p>
      </div>
    );
  }

  const statusOptions: Array<{ value: AssignmentStatus; label: string }> =
    assignment.status === "draft"
      ? [
          { value: "draft", label: "Bản nháp (draft)" },
          { value: "published", label: "Đã phát hành (published)" },
        ]
      : assignment.status === "published"
        ? [
            { value: "published", label: "Đã phát hành (published)" },
            { value: "closed", label: "Đã đóng bài (closed)" },
          ]
        : [
            { value: "closed", label: "Đã đóng bài (closed)" },
            { value: "published", label: "Đã phát hành (published)" },
          ];

  return (
    <div className="settings-stack">
      <form
        className="form-stack"
        onSubmit={updateAssignment}
        autoComplete="off"
      >
        <label className="form-field">
          <span className="form-label">Tên bài tập</span>
          <input
            className="form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <div className="grid">
          <label className="form-field">
            <span className="form-label">Điểm tối đa</span>
            <input
              className="form-input"
              type="number"
              min="0.1"
              max="999.9"
              step="0.1"
              value={maxScore}
              onChange={(event) => setMaxScore(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span className="form-label">Trạng thái bài tập</span>
            <select
              className="form-input"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AssignmentStatus)
              }
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {successMsg && (
          <p className="form-success" role="status">
            {successMsg}
          </p>
        )}

        {confirmDelete ? (
          <div
            className="form-notice"
            style={{
              borderColor: "var(--color-error)",
              background: "var(--color-error-soft)",
            }}
          >
            <p
              style={{
                color: "var(--color-error)",
                margin: 0,
                fontSize: "0.88rem",
              }}
            >
              <strong>Xác nhận:</strong> Bạn có chắc chắn muốn xóa bài tập này?
              (Chỉ xóa được nếu chưa có sinh viên nộp bài).
            </p>
            <div className="cluster" style={{ marginTop: "10px" }}>
              <button
                type="button"
                className="button button-secondary button-sm"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() => void deleteAssignment()}
              >
                {busy ? "Đang xóa…" : "Xác nhận xóa bài tập"}
              </button>
            </div>
          </div>
        ) : (
          <div className="dialog-actions">
            <button
              className="btn btn-outline-danger"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              type="button"
              style={{ marginRight: "auto" }}
            >
              Xóa bài tập này
            </button>
            {onClose && (
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={onClose}
              >
                Đóng
              </button>
            )}
            <button className="button" disabled={busy} type="submit">
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        )}
      </form>

      <AttachmentUploadPanel
        assignmentId={assignment.id}
        disabled={assignment.status === "closed"}
      />
    </div>
  );
}
