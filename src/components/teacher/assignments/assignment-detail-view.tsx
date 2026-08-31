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
}: {
  assignmentId: string;
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

  function applyAssignment(next: AssignmentDto): void {
    setAssignment(next);
    setTitle(next.title);
    setDescription(next.description);
    setAssignedDate(next.assignedDate);
    setDueDate(next.dueDate);
    setMaxScore(String(next.maxScore));
    setStatus(next.status);
  }

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          `/api/v1/teacher/assignments/${assignmentId}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as ApiResult<AssignmentDto>;
        if (!response.ok || !("data" in body))
          throw new Error(apiMessage(body, "Không thể tải bài tập"));
        applyAssignment(body.data);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Không thể tải bài tập",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  async function updateAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
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
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể cập nhật bài tập",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteAssignment() {
    if (!window.confirm("Xóa bài tập nháp này?")) return;
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
      router.push("/teacher/assignments");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa bài tập",
      );
      setBusy(false);
    }
  }

  if (loading)
    return (
      <section className="surface">
        <p className="muted">Đang tải...</p>
      </section>
    );
  if (!assignment)
    return (
      <section className="surface">
        <p className="form-error">{error ?? "Không tìm thấy bài tập"}</p>
      </section>
    );

  const statusOptions: AssignmentStatus[] =
    assignment.status === "draft"
      ? ["draft", "published"]
      : assignment.status === "published"
        ? ["published", "closed"]
        : ["closed", "published"];

  return (
    <section className="surface">
      <p className="eyebrow">Dev A</p>
      <h1>Chỉnh sửa bài tập</h1>
      <form className="login-form" onSubmit={updateAssignment}>
        <label className="form-field">
          <span className="form-label">Tên bài tập</span>
          <input
            className="form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span className="form-label">Mô tả</span>
          <textarea
            className="form-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="form-field">
          <span className="form-label">Ngày giao</span>
          <input
            className="form-input"
            type="date"
            value={assignedDate}
            onChange={(event) => setAssignedDate(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span className="form-label">Hạn nộp</span>
          <input
            className="form-input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </label>
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
          <span className="form-label">Trạng thái</span>
          <select
            className="form-input"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AssignmentStatus)
            }
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button className="button" disabled={busy} type="submit">
          Lưu thay đổi
        </button>
        {assignment.status === "draft" ? (
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() => void deleteAssignment()}
            type="button"
          >
            Xóa bài tập nháp
          </button>
        ) : null}
      </form>
      <AttachmentUploadPanel
        assignmentId={assignment.id}
        disabled={assignment.status === "closed"}
      />
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
