"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import type { SubmissionHistoryDto } from "@/types/submission";

import { SubmissionUploadPanel } from "./submission-upload-panel";
import type { StudentProfileAssignment } from "./student-profile-view";

export function StudentAssignmentModal({
  assignment,
  open,
  onClose,
  onSubmitted,
}: {
  assignment: StudentProfileAssignment;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [history, setHistory] = useState<SubmissionHistoryDto | null>(null);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    void fetch(`/api/v1/student/assignments/${assignment.id}/submissions`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          data?: SubmissionHistoryDto;
          error?: { message?: string };
        };
        if (!response.ok || !body.data) {
          throw new Error(
            body.error?.message ?? "Không thể tải lịch sử nộp bài",
          );
        }
        if (active) setHistory(body.data);
      })
      .catch((error: unknown) => {
        if (active)
          setHistoryError(
            error instanceof Error ? error.message : "Không thể tải lịch sử",
          );
      });
    return () => {
      active = false;
    };
  }, [assignment.id, open]);

  return (
    <Modal open={open} onClose={onClose} title={assignment.title}>
      <p className="muted">{assignment.description || "Không có mô tả."}</p>
      <p>Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString("vi-VN")}</p>
      {assignment.attachments.length ? (
        <div className="stack">
          <strong>Tài liệu bài tập</strong>
          {assignment.attachments.map((file) => (
            <a key={file.id} href={file.downloadUrl}>
              {file.originalName} ({Math.ceil(file.bytes / 1024)} KB)
            </a>
          ))}
        </div>
      ) : null}
      {assignment.evaluation ? (
        <div className="form-notice">
          <strong>
            Kết quả: {assignment.evaluation.score ?? "—"}/{assignment.maxScore}
          </strong>
          {assignment.evaluation.feedback ? (
            <p>{assignment.evaluation.feedback}</p>
          ) : null}
        </div>
      ) : null}
      <div className="stack">
        <strong>
          Lịch sử nộp bài (
          {history?.attemptCount ?? assignment.submission.attemptCount}/10)
        </strong>
        {historyError ? <p className="form-error">{historyError}</p> : null}
        {history?.attempts.map((attempt) => (
          <div className="card" key={attempt.id}>
            <div className="split">
              <strong>Lần #{attempt.attemptNumber}</strong>
              {attempt.isLate ? (
                <span className="badge badge-warning">Nộp trễ</span>
              ) : null}
            </div>
            <p className="muted">
              {new Date(attempt.submittedAt).toLocaleString("vi-VN")}
            </p>
            {attempt.files.map((file) => (
              <a key={file.id} href={file.downloadUrl}>
                {file.originalName}
              </a>
            ))}
          </div>
        ))}
      </div>
      <SubmissionUploadPanel
        assignmentId={assignment.id}
        status={assignment.status}
        submission={history ?? assignment.submission}
        onSubmitted={onSubmitted}
      />
    </Modal>
  );
}
