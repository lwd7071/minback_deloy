"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  File as GenericFile,
  Sparkles,
  Award,
  CheckCircle2,
  Paperclip,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { formatDeadlineInfo } from "@/lib/deadline-utils";
import type { StudentProfileAssignmentDto } from "@/types/student-profile";
import type { SubmissionHistoryDto } from "@/types/submission";

import { SubmissionUploadPanel } from "./submission-upload-panel";

function formatBytes(bytes: number): string {
  if (bytes <= 0 || Number.isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatFullDateTime(dateString: string): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

function getFileIcon(format: string, originalName: string) {
  const ext = (format || originalName.split(".").pop() || "").toLowerCase();
  if (["pdf"].includes(ext)) {
    return <FileText size={20} className="text-danger" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet size={20} className="text-success" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive size={20} className="text-warning" />;
  }
  if (["doc", "docx", "txt", "md"].includes(ext)) {
    return <FileText size={20} className="text-info" />;
  }
  return <GenericFile size={20} />;
}

export function StudentAssignmentModal({
  assignment,
  open,
  onClose,
  onSubmitted,
}: {
  assignment: StudentProfileAssignmentDto;
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

  const attachments = assignment.attachments ?? [];
  const deadline = formatDeadlineInfo(assignment.dueDate);

  return (
    <Modal open={open} onClose={onClose} title={assignment.title} size="lg">
      <div className="student-modal-body">
        {/* Thanh thông tin tổng quan bài tập */}
        <div className="student-assignment-meta-bar">
          <div className="student-assignment-meta-item">
            <Clock size={16} aria-hidden="true" />
            <span>Hạn chốt:</span>
            <strong style={{ color: deadline.isExpired ? "var(--danger)" : "var(--navy-900)" }}>
              {deadline.formattedFull}
            </strong>
          </div>
          <div className="student-assignment-meta-item">
            <Award size={16} aria-hidden="true" />
            <span>Thang điểm:</span>
            <strong>{assignment.maxScore} điểm</strong>
          </div>
          <div className="student-assignment-meta-item">
            <Calendar size={16} aria-hidden="true" />
            <span>Ngày giao:</span>
            <strong>{formatFullDateTime(assignment.assignedDate)}</strong>
          </div>
          <div className="student-assignment-meta-item">
            <span
              className={`badge ${
                deadline.urgency === "urgent" || deadline.isExpired
                  ? "badge-danger"
                  : deadline.urgency === "warning"
                  ? "badge-warning"
                  : "badge-neutral"
              }`}
            >
              ⏳ {deadline.timeRemainingNotice}
            </span>
          </div>
          <div className="student-assignment-meta-item">
            <span
              className={`badge ${assignment.status === "published" ? "badge-success" : "badge-neutral"}`}
            >
              {assignment.status === "published" ? "Đang mở nộp" : "Đã kết thúc"}
            </span>
          </div>
        </div>

        {/* Phần 1: Hướng dẫn & Yêu cầu bài tập từ Giảng viên */}
        <section className="student-section-card" aria-labelledby="instruction-heading">
          <div className="student-section-header">
            <h3 id="instruction-heading" className="student-section-title">
              <FileText size={18} aria-hidden="true" />
              Nội dung & Yêu cầu bài tập
            </h3>
          </div>
          {assignment.description?.trim() ? (
            <p className="student-instruction-text">{assignment.description}</p>
          ) : (
            <p className="muted" style={{ fontStyle: "italic", margin: 0 }}>
              Giảng viên không để lại mô tả văn bản bổ sung cho bài tập này.
            </p>
          )}
        </section>

        {/* Phần 2: Tài liệu & File hướng dẫn đính kèm */}
        <section className="student-section-card" aria-labelledby="attachments-heading">
          <div className="student-section-header">
            <h3 id="attachments-heading" className="student-section-title">
              <Paperclip size={18} aria-hidden="true" />
              Tài liệu & File hướng dẫn đính kèm ({attachments.length})
            </h3>
          </div>
          {attachments.length > 0 ? (
            <div className="student-attachment-list">
              {attachments.map((file) => (
                <a
                  key={file.id}
                  href={file.downloadUrl}
                  className="student-attachment-card"
                  download={file.originalName}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Tải xuống ${file.originalName} (${formatBytes(file.bytes)})`}
                >
                  <div className="student-attachment-info">
                    <span className="student-attachment-icon">
                      {getFileIcon(file.format, file.originalName)}
                    </span>
                    <div className="student-attachment-meta">
                      <span className="student-attachment-name" title={file.originalName}>
                        {file.originalName}
                      </span>
                      <span className="student-attachment-size">
                        {formatBytes(file.bytes)}
                      </span>
                    </div>
                  </div>
                  <span className="student-attachment-action">
                    <Download size={15} aria-hidden="true" />
                    <span>Tải về</span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: "italic", margin: 0 }}>
              Bài tập này không có tài liệu đính kèm từ giảng viên.
            </p>
          )}
        </section>

        {/* Phần 3: Kết quả chấm điểm & Nhận xét của Giảng viên */}
        {assignment.evaluation ? (
          <section className="student-section-card" aria-labelledby="evaluation-heading">
            <div className="student-section-header">
              <h3 id="evaluation-heading" className="student-section-title">
                <Sparkles size={18} aria-hidden="true" />
                Kết quả đánh giá của Giảng viên
              </h3>
              <span
                className={`badge ${
                  assignment.evaluation.status === "graded" ||
                  assignment.evaluation.status === "returned"
                    ? "badge-success"
                    : "badge-warning"
                }`}
              >
                {assignment.evaluation.status === "graded"
                  ? "Đã chấm điểm"
                  : assignment.evaluation.status === "returned"
                  ? "Đã trả bài"
                  : "Đang chấm"}
              </span>
            </div>
            <div className="form-notice" style={{ margin: 0 }}>
              <div style={{ fontSize: "1.05rem", marginBottom: "4px" }}>
                <strong>Điểm số đạt được: </strong>
                <strong style={{ fontSize: "1.2rem", color: "var(--navy-900)" }}>
                  {assignment.evaluation.score !== null
                    ? `${assignment.evaluation.score}/${assignment.maxScore}`
                    : "—"}
                </strong>
              </div>
              {assignment.evaluation.feedback ? (
                <div style={{ marginTop: "6px" }}>
                  <span style={{ fontWeight: 600 }}>Nhận xét: </span>
                  <span>{assignment.evaluation.feedback}</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Phần 4: Lịch sử các lần nộp bài */}
        <section className="student-section-card" aria-labelledby="history-heading">
          <div className="student-section-header">
            <h3 id="history-heading" className="student-section-title">
              <CheckCircle2 size={18} aria-hidden="true" />
              Lịch sử nộp bài (
              {history?.attemptCount ?? assignment.submission.attemptCount}/10 lần)
            </h3>
          </div>
          {historyError ? <p className="form-error">{historyError}</p> : null}
          {history?.attempts && history.attempts.length > 0 ? (
            <div className="stack" style={{ gap: "10px" }}>
              {history.attempts.map((attempt) => (
                <div
                  className="card"
                  key={attempt.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="split" style={{ marginBottom: "6px" }}>
                    <strong>Lần nộp #{attempt.attemptNumber}</strong>
                    {attempt.isLate ? (
                      <span className="badge badge-warning">Nộp trễ</span>
                    ) : (
                      <span className="badge badge-success">Đúng hạn</span>
                    )}
                  </div>
                  <p className="muted" style={{ fontSize: "0.82rem", margin: "0 0 8px 0" }}>
                    Thời gian nộp: {formatFullDateTime(attempt.submittedAt)}
                  </p>
                  <div className="student-attachment-list">
                    {attempt.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.downloadUrl}
                        className="student-attachment-card"
                        download={file.originalName}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="student-attachment-info">
                          <span className="student-attachment-icon">
                            {getFileIcon(file.format, file.originalName)}
                          </span>
                          <div className="student-attachment-meta">
                            <span
                              className="student-attachment-name"
                              title={file.originalName}
                            >
                              {file.originalName}
                            </span>
                            <span className="student-attachment-size">
                              {formatBytes(file.bytes)}
                            </span>
                          </div>
                        </div>
                        <span className="student-attachment-action">
                          <Download size={14} aria-hidden="true" />
                          <span>Tải</span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: "italic", margin: 0 }}>
              Bạn chưa nộp bài lần nào cho bài tập này.
            </p>
          )}
        </section>

        {/* Phần 5: Nộp bài mới */}
        <SubmissionUploadPanel
          assignmentId={assignment.id}
          status={assignment.status}
          submission={history ?? assignment.submission}
          onSubmitted={onSubmitted}
        />
      </div>
    </Modal>
  );
}
