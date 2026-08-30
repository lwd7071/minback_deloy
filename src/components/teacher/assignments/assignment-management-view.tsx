"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ClassSectionDto } from "@/types/class-section";
import type { AssignmentDto } from "@/types/assignment";

type ApiResult<T> = { data: T } | { error: { message: string } };

function apiMessage<T>(body: ApiResult<T>, fallback: string): string {
  return "error" in body ? body.error.message : fallback;
}

export function AssignmentManagementView() {
  const router = useRouter();
  const [classSections, setClassSections] = useState<ClassSectionDto[]>([]);
  const [classSectionId, setClassSectionId] = useState("");
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState("10");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAssignments(nextClassSectionId: string): Promise<void> {
    if (!nextClassSectionId) {
      setAssignments([]);
      return;
    }
    const response = await fetch(
      `/api/v1/teacher/class-sections/${nextClassSectionId}/assignments`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as ApiResult<AssignmentDto[]>;
    if (!response.ok || !("data" in body)) {
      throw new Error(apiMessage(body, "Không thể tải bài tập"));
    }
    setAssignments(body.data);
  }

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          "/api/v1/teacher/class-sections?page=1&pageSize=100",
          {
            cache: "no-store",
          },
        );
        const body = (await response.json()) as ApiResult<ClassSectionDto[]>;
        if (!response.ok || !("data" in body)) {
          throw new Error(apiMessage(body, "Không thể tải lớp học phần"));
        }
        setClassSections(body.data);
        const firstId = body.data[0]?.id ?? "";
        setClassSectionId(firstId);
        await loadAssignments(firstId);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Không thể tải bài tập",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function selectClassSection(nextClassSectionId: string): Promise<void> {
    setClassSectionId(nextClassSectionId);
    setError(null);
    try {
      await loadAssignments(nextClassSectionId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải bài tập",
      );
    }
  }

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classSectionId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/assignments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            assignedDate,
            dueDate,
            maxScore: Number(maxScore),
          }),
        },
      );
      const body = (await response.json()) as ApiResult<AssignmentDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(apiMessage(body, "Không thể tạo bài tập"));
      }
      setAssignments((current) => [body.data, ...current]);
      setTitle("");
      setDescription("");
      setAssignedDate("");
      setDueDate("");
      setMaxScore("10");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tạo bài tập",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="surface">
        <p className="muted">Đang tải...</p>
      </section>
    );
  }

  return (
    <section className="surface">
      <p className="eyebrow">Dev A</p>
      <h1>Quản lý bài tập</h1>
      <label className="form-field">
        <span className="form-label">Lớp học phần</span>
        <select
          className="form-input"
          value={classSectionId}
          onChange={(event) => void selectClassSection(event.target.value)}
          disabled={busy || classSections.length === 0}
        >
          {classSections.map((classSection) => (
            <option key={classSection.id} value={classSection.id}>
              {classSection.code} — {classSection.name}
            </option>
          ))}
        </select>
      </label>
      {classSections.length === 0 ? (
        <p className="muted">Hãy tạo lớp học phần trước khi tạo bài tập.</p>
      ) : (
        <form className="login-form" onSubmit={createAssignment}>
          <h2>Tạo bài tập</h2>
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
          <button className="button" disabled={busy} type="submit">
            {busy ? "Đang tạo..." : "Tạo bài tập nháp"}
          </button>
        </form>
      )}
      <section>
        <h2>Danh sách bài tập</h2>
        {assignments.length === 0 ? (
          <p className="muted">Chưa có bài tập.</p>
        ) : (
          <ul>
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <button
                  className="button button-secondary"
                  onClick={() =>
                    router.push(`/teacher/assignments/${assignment.id}`)
                  }
                  type="button"
                >
                  {assignment.title} — {assignment.status} (
                  {assignment.assignedDate} → {assignment.dueDate})
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
