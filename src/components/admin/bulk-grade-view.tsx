"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AssignmentDto } from "@/types/assignment";
import type {
  EvaluationStatus,
  EvaluationWithStudentDto,
} from "@/types/evaluation";
import type { StudentAdminDto } from "@/types/student";
import type { SubmissionListItemDto } from "@/types/submission";
type Draft = {
  studentId: string;
  score: string;
  feedback: string;
  status: EvaluationStatus;
};
export function BulkGradeView({
  classSectionId,
  assignmentId,
}: {
  classSectionId: string;
  assignmentId: string;
}) {
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [students, setStudents] = useState<StudentAdminDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [submissions, setSubmissions] = useState<
    Record<string, SubmissionListItemDto>
  >({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`/api/v1/teacher/assignments/${assignmentId}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/students?page=1&pageSize=100`,
        { cache: "no-store" },
      ).then((r) => r.json()),
      fetch(`/api/v1/teacher/assignments/${assignmentId}/evaluations`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`/api/v1/teacher/assignments/${assignmentId}/submissions`, {
        cache: "no-store",
      }).then((r) => r.json()),
    ]).then(([a, s, e, u]) => {
      if (!active) return;
      setAssignment(a.data);
      const list = (s.data ?? []) as StudentAdminDto[];
      const evaluations = (e.data ?? []) as EvaluationWithStudentDto[];
      setStudents(list);
      setDrafts(
        Object.fromEntries(
          list.map((student) => {
            const current = evaluations.find(
              (value) => value.studentId === student.id,
            );
            return [
              student.id,
              {
                studentId: student.id,
                score: current?.score == null ? "" : String(current.score),
                feedback: current?.feedback ?? "",
                status: current?.status ?? "pending",
              },
            ];
          }),
        ),
      );
      setSubmissions(
        Object.fromEntries(
          ((u.data ?? []) as SubmissionListItemDto[]).map((item) => [
            item.student.id,
            item,
          ]),
        ),
      );
    });
    return () => {
      active = false;
    };
  }, [assignmentId, classSectionId]);
  function update(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }
  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/evaluations/bulk`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            evaluations: Object.values(drafts).map((row) => ({
              ...row,
              score: row.score === "" ? null : Number(row.score),
            })),
          }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Không thể lưu bảng điểm");
      setMessage(`Đã lưu ${body.data.length} thay đổi.`);
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Không thể lưu bảng điểm",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!assignment) return <p className="muted">Đang tải danh sách chấm bài…</p>;
  return (
    <div className="stack">
      <Card className="grade-header">
        <div className="split">
          <div>
            <Badge variant={assignment.status}>{assignment.status}</Badge>
            <h1>{assignment.title}</h1>
            <p className="muted">
              Điểm tối đa {assignment.maxScore} · Hạn {assignment.dueDate}
            </p>
          </div>
          <Button loading={busy} onClick={() => void save()}>
            Lưu tất cả
          </Button>
        </div>
      </Card>
      {students.map((student) => {
        const draft = drafts[student.id];
        const submission = submissions[student.id];
        if (!draft) return null;
        return (
          <Card className="grade-row" key={student.id}>
            <div className="split">
              <div>
                <strong>
                  {student.mssv} — {student.fullName}
                </strong>
                <p className="muted">
                  {submission?.attemptCount ?? 0} lần nộp
                  {submission?.latestAttempt?.isLate ? " · Nộp trễ" : ""}
                </p>
              </div>
              {submission?.latestAttempt ? (
                <div className="cluster">
                  {submission.latestAttempt.files.map((file) => (
                    <a
                      className="btn btn-secondary"
                      href={file.downloadUrl}
                      key={file.id}
                    >
                      {file.originalName}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid">
              <label className="form-field">
                <span>Điểm</span>
                <input
                  type="number"
                  min="0"
                  max={assignment.maxScore}
                  step="0.1"
                  value={draft.score}
                  onChange={(event) =>
                    update(student.id, { score: event.target.value })
                  }
                />
              </label>
              <label className="form-field">
                <span>Trạng thái</span>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    update(student.id, {
                      status: event.target.value as EvaluationStatus,
                    })
                  }
                >
                  <option value="pending">pending</option>
                  <option value="graded">graded</option>
                  <option value="returned">returned</option>
                </select>
              </label>
            </div>
            <label className="form-field">
              <span>Phản hồi</span>
              <textarea
                value={draft.feedback}
                onChange={(event) =>
                  update(student.id, { feedback: event.target.value })
                }
              />
            </label>
          </Card>
        );
      })}
      {message ? (
        <p className={message.startsWith("Đã") ? "form-success" : "form-error"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
