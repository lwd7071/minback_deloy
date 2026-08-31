"use client";

import { useCallback, useEffect, useState } from "react";

import type { AssignmentDto } from "@/types/assignment";
import type { ClassSectionDto } from "@/types/class-section";
import type {
  EvaluationDto,
  EvaluationStatus,
  EvaluationWithStudentDto,
} from "@/types/evaluation";
import type { StudentAdminDto } from "@/types/student";

type ApiResult<T> = { data: T } | { error: { message: string } };

function apiMessage<T>(body: ApiResult<T>, fallback: string): string {
  return "error" in body ? body.error.message : fallback;
}

export function EvaluationManagementView() {
  const [classSections, setClassSections] = useState<ClassSectionDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [students, setStudents] = useState<StudentAdminDto[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationWithStudentDto[]>(
    [],
  );
  const [classSectionId, setClassSectionId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<EvaluationStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyEvaluation = useCallback(
    (
      nextStudentId: string,
      currentEvaluations: EvaluationWithStudentDto[],
    ): void => {
      const evaluation = currentEvaluations.find(
        (item) => item.studentId === nextStudentId,
      );
      setScore(
        evaluation?.score === null || evaluation?.score === undefined
          ? ""
          : String(evaluation.score),
      );
      setFeedback(evaluation?.feedback ?? "");
      setStatus(evaluation?.status ?? "pending");
    },
    [],
  );

  const loadEvaluations = useCallback(
    async (nextAssignmentId: string, nextStudentId: string): Promise<void> => {
      if (!nextAssignmentId) {
        setEvaluations([]);
        applyEvaluation(nextStudentId, []);
        return;
      }
      const response = await fetch(
        `/api/v1/teacher/assignments/${nextAssignmentId}/evaluations`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ApiResult<
        EvaluationWithStudentDto[]
      >;
      if (!response.ok || !("data" in body)) {
        throw new Error(apiMessage(body, "Không thể tải đánh giá"));
      }
      setEvaluations(body.data);
      applyEvaluation(nextStudentId, body.data);
    },
    [applyEvaluation],
  );

  const loadClassSection = useCallback(
    async (nextClassSectionId: string): Promise<void> => {
      if (!nextClassSectionId) return;
      const [assignmentResponse, studentResponse] = await Promise.all([
        fetch(
          `/api/v1/teacher/class-sections/${nextClassSectionId}/assignments`,
          {
            cache: "no-store",
          },
        ),
        fetch(
          `/api/v1/teacher/class-sections/${nextClassSectionId}/students?page=1&pageSize=100`,
          { cache: "no-store" },
        ),
      ]);
      const assignmentBody = (await assignmentResponse.json()) as ApiResult<
        AssignmentDto[]
      >;
      const studentBody = (await studentResponse.json()) as ApiResult<
        StudentAdminDto[]
      >;
      if (!assignmentResponse.ok || !("data" in assignmentBody)) {
        throw new Error(apiMessage(assignmentBody, "Không thể tải bài tập"));
      }
      if (!studentResponse.ok || !("data" in studentBody)) {
        throw new Error(apiMessage(studentBody, "Không thể tải sinh viên"));
      }
      setAssignments(assignmentBody.data);
      setStudents(studentBody.data);
      const nextAssignmentId = assignmentBody.data[0]?.id ?? "";
      const nextStudentId = studentBody.data[0]?.id ?? "";
      setAssignmentId(nextAssignmentId);
      setStudentId(nextStudentId);
      await loadEvaluations(nextAssignmentId, nextStudentId);
    },
    [loadEvaluations],
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          "/api/v1/teacher/class-sections?page=1&pageSize=100",
          { cache: "no-store" },
        );
        const body = (await response.json()) as ApiResult<ClassSectionDto[]>;
        if (!response.ok || !("data" in body)) {
          throw new Error(apiMessage(body, "Không thể tải lớp học phần"));
        }
        setClassSections(body.data);
        const firstId = body.data[0]?.id ?? "";
        setClassSectionId(firstId);
        await loadClassSection(firstId);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Không thể tải đánh giá",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadClassSection]);

  async function selectClassSection(nextId: string): Promise<void> {
    setClassSectionId(nextId);
    setError(null);
    try {
      await loadClassSection(nextId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải đánh giá",
      );
    }
  }

  async function selectAssignment(nextId: string): Promise<void> {
    setAssignmentId(nextId);
    setError(null);
    try {
      await loadEvaluations(nextId, studentId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải đánh giá",
      );
    }
  }

  function selectStudent(nextId: string): void {
    setStudentId(nextId);
    applyEvaluation(nextId, evaluations);
  }

  async function saveEvaluation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignmentId || !studentId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/students/${studentId}/evaluation`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            score: score === "" ? null : Number(score),
            feedback,
            status,
          }),
        },
      );
      const body = (await response.json()) as ApiResult<EvaluationDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(apiMessage(body, "Không thể lưu đánh giá"));
      }
      await loadEvaluations(assignmentId, studentId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu đánh giá",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <section className="surface">
        <p className="muted">Đang tải...</p>
      </section>
    );

  const selectedAssignment = assignments.find(
    (item) => item.id === assignmentId,
  );

  return (
    <section className="surface">
      <p className="eyebrow">Dev A</p>
      <h1>Nhập đánh giá</h1>
      <label className="form-field">
        <span className="form-label">Lớp học phần</span>
        <select
          className="form-input"
          value={classSectionId}
          onChange={(event) => void selectClassSection(event.target.value)}
        >
          {classSections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} — {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span className="form-label">Bài tập</span>
        <select
          className="form-input"
          value={assignmentId}
          onChange={(event) => void selectAssignment(event.target.value)}
        >
          {assignments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span className="form-label">Sinh viên</span>
        <select
          className="form-input"
          value={studentId}
          onChange={(event) => selectStudent(event.target.value)}
        >
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.mssv} — {item.fullName}
            </option>
          ))}
        </select>
      </label>
      {!assignmentId || !studentId ? (
        <p className="muted">
          Cần có bài tập và sinh viên trong lớp để nhập đánh giá.
        </p>
      ) : (
        <form className="login-form" onSubmit={saveEvaluation}>
          <label className="form-field">
            <span className="form-label">
              Điểm (tối đa {selectedAssignment?.maxScore ?? "—"})
            </span>
            <input
              className="form-input"
              type="number"
              min="0"
              max={selectedAssignment?.maxScore}
              step="0.1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span className="form-label">Feedback</span>
            <textarea
              className="form-input"
              maxLength={5000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span className="form-label">Trạng thái</span>
            <select
              className="form-input"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as EvaluationStatus)
              }
            >
              <option value="pending">pending</option>
              <option value="graded">graded</option>
              <option value="returned">returned</option>
            </select>
          </label>
          <button className="button" disabled={busy} type="submit">
            {busy ? "Đang lưu..." : "Lưu đánh giá"}
          </button>
        </form>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
