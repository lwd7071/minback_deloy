"use client";

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
  Paperclip,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { formatDeadlineInfo } from "@/lib/deadline-utils";
import type { StudentProfileAssignmentDto } from "@/types/student-profile";

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
}: {
  assignment: StudentProfileAssignmentDto;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
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
              <span className="badge badge-success">
                Đã công bố điểm
              </span>
            </div>
            <div className="form-notice" style={{ margin: 0 }}>
              <div style={{ fontSize: "1.05rem", marginBottom: "4px" }}>
                <strong>Điểm số đạt được: </strong>
                <strong style={{ fontSize: "1.25rem", color: "var(--navy-900)" }}>
                  {assignment.evaluation.score !== null
                    ? `${assignment.evaluation.score} / ${assignment.maxScore}`
                    : "—"}
                </strong>
              </div>
              {assignment.evaluation.feedback ? (
                <div style={{ marginTop: "8px" }}>
                  <strong style={{ display: "block", marginBottom: "2px" }}>Nhận xét từ Giảng viên:</strong>
                  <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border)", whiteSpace: "pre-wrap" }}>
                    {assignment.evaluation.feedback}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="student-section-card" aria-labelledby="evaluation-heading">
            <div className="student-section-header">
              <h3 id="evaluation-heading" className="student-section-title">
                <Sparkles size={18} aria-hidden="true" />
                Kết quả đánh giá của Giảng viên
              </h3>
              <span className="badge badge-neutral">
                Đang xử lý / Chưa công bố
              </span>
            </div>
            <p className="muted" style={{ margin: 0, fontStyle: "italic" }}>
              Giảng viên đang chấm điểm trên LMS/Excel. Khi có kết quả chính thức, bạn sẽ nhận được thông báo qua email và xem chi tiết tại đây.
            </p>
          </section>
        )}
      </div>
    </Modal>
  );
}
