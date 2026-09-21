"use client";

import { useEffect, useState } from "react";

import type { AssignmentDto } from "@/types/assignment";
import { Skeleton } from "@/components/ui/skeleton";

type ApiResult<T> = { data: T } | { error: { message: string } };

function apiMessage<T>(body: ApiResult<T>, fallback: string): string {
  return "error" in body ? body.error.message : fallback;
}

export function AssignmentDetailView({
  assignmentId,
  initialAssignment,
  onSaved,
  onClose,
}: {
  assignmentId: string;
  initialAssignment?: AssignmentDto;
  onSaved?: (updated: AssignmentDto) => void;
  onClose?: () => void;
}) {
  const [assignment, setAssignment] = useState<AssignmentDto | null>(
    initialAssignment ?? null,
  );
  const [title, setTitle] = useState(initialAssignment?.title ?? "");
  const [loading, setLoading] = useState(!initialAssignment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function applyAssignment(next: AssignmentDto): void {
    setAssignment(next);
    setTitle(next.title);
  }

  useEffect(() => {
    if (initialAssignment) return;
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
  }, [assignmentId, initialAssignment]);

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
          body: JSON.stringify({ title }),
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

  if (loading) {
    return (
      <div className="settings-stack" aria-live="polite" aria-busy="true">
        <Skeleton width="100%" height="42px" />
        <Skeleton width="120px" height="38px" />
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

        <div className="dialog-actions">
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
      </form>
    </div>
  );
}
