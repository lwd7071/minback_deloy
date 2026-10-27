"use client";

import { useEffect, useState } from "react";

import type { AssignmentDto, TeacherAssignmentSummaryDto } from "@/types/assignment";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_CAPABILITIES } from "@/config/product-capabilities";

type ApiResult<T> = { data: T } | { error: { message: string } };

function apiMessage<T>(body: ApiResult<T>, fallback: string): string {
  return "error" in body ? body.error.message : fallback;
}

export function AssignmentDetailView({
  assignmentId,
  initialAssignment,
  onSaved,
  onDeleted,
  onClose,
}: {
  assignmentId: string;
  initialAssignment?: AssignmentDto | TeacherAssignmentSummaryDto;
  onSaved?: (updated: AssignmentDto) => void;
  onDeleted?: (deletedId: string) => void;
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [deleting, setDeleting] = useState(false);

  const summary =
    initialAssignment && "gradingSummary" in initialAssignment
      ? initialAssignment.gradingSummary
      : undefined;
  const evaluatedCount = summary?.evaluatedCount ?? 0;

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

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const url =
        evaluatedCount > 0
          ? `/api/v1/teacher/assignments/${assignmentId}?force=true`
          : `/api/v1/teacher/assignments/${assignmentId}`;
      const response = await fetch(url, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as ApiResult<never>;
        throw new Error(apiMessage(body, "Không thể xóa bài tập"));
      }
      onDeleted?.(assignmentId);
      onClose?.();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa bài tập",
      );
      setIsConfirmingDelete(false);
    } finally {
      setDeleting(false);
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

  if (isConfirmingDelete) {
    return (
      <div className="settings-stack">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {evaluatedCount > 0 ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-error)",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
              }}
            >
              <h4
                style={{
                  color: "var(--color-error)",
                  margin: "0 0 8px 0",
                  fontWeight: 600,
                }}
              >
                ⚠️ Cảnh báo nguy hiểm
              </h4>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                Bài tập này đã có <strong>{evaluatedCount}</strong> sinh viên có
                kết quả/điểm số. Nếu xóa, toàn bộ dữ liệu điểm số, tiêu chí và
                lịch sử đánh giá sẽ bị{" "}
                <strong style={{ color: "var(--color-error)" }}>
                  XÓA VĨNH VIỄN
                </strong>{" "}
                và không thể khôi phục.
              </p>
              <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem" }}>
                Để xác nhận, vui lòng nhập chính xác tên bài tập:{" "}
                <strong>{assignment.title}</strong>
              </p>
              <input
                className="form-input"
                style={{ width: "100%", marginTop: "4px" }}
                value={confirmTitle}
                onChange={(e) => setConfirmTitle(e.target.value)}
                placeholder={assignment.title}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "1rem",
                  lineHeight: 1.5,
                }}
              >
                Bạn có chắc chắn muốn xóa bài tập{" "}
                <strong>{assignment.title}</strong>? Thao tác này không thể hoàn
                tác.
              </p>
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div
            className="dialog-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <button
              type="button"
              className="button button-secondary"
              disabled={deleting}
              onClick={() => {
                setIsConfirmingDelete(false);
                setConfirmTitle("");
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              className="button btn-danger"
              disabled={
                deleting ||
                (evaluatedCount > 0 &&
                  confirmTitle.trim() !== assignment.title.trim())
              }
              onClick={handleDelete}
            >
              {deleting
                ? "Đang xóa…"
                : evaluatedCount > 0
                  ? "Xác nhận xóa vĩnh viễn"
                  : "Xóa bài tập"}
            </button>
          </div>
        </div>
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

        <div
          className="dialog-actions"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {PRODUCT_CAPABILITIES.teacher.assignmentDelete && (
              <button
                type="button"
                className="button btn-danger"
                style={{ cursor: "pointer" }}
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setIsConfirmingDelete(true);
                }}
              >
                Xóa bài tập
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
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
        </div>
      </form>
    </div>
  );
}
