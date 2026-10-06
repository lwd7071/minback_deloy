"use client";

import { Sparkles } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import type { StudentProfileAssignmentDto } from "@/types/student-profile";

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
  return (
    <Modal open={open} onClose={onClose} title={assignment.title} size="lg">
      <div className="student-modal-body">
        {assignment.evaluation ? (
          <section
            className="student-section-card"
            aria-labelledby="evaluation-heading"
          >
            <div className="student-section-header">
              <h3 id="evaluation-heading" className="student-section-title">
                <Sparkles size={18} aria-hidden="true" />
                Kết quả đánh giá của Giảng viên
              </h3>
              <span className="badge badge-success">Đã công bố điểm</span>
            </div>
            <div className="form-notice" style={{ margin: 0 }}>
              <div style={{ fontSize: "1.05rem", marginBottom: "4px" }}>
                <strong>Điểm số đạt được: </strong>
                <strong
                  style={{ fontSize: "1.25rem", color: "var(--color-primary)" }}
                >
                  {assignment.evaluation.score !== null
                    ? `${assignment.evaluation.score} / ${assignment.maxScore}`
                    : "—"}
                </strong>
              </div>
              {assignment.evaluation.criteriaScores &&
              assignment.evaluation.criteriaScores.length > 0 ? (
                <div
                  style={{
                    margin: "12px 0",
                    padding: "10px 12px",
                    background: "var(--color-surface)",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "0.85rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Điểm theo tiêu chí đánh giá:
                  </strong>
                  <div style={{ display: "grid", gap: "4px" }}>
                    {assignment.evaluation.criteriaScores.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          background: "var(--color-surface-elevated, transparent)",
                        }}
                      >
                        <span>
                          {c.name}{" "}
                          <span className="muted" style={{ fontSize: "0.8rem" }}>
                            ({c.weight}%)
                          </span>
                        </span>
                        <strong
                          style={{
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        >
                          {c.score !== null ? c.score : "—"} / 10
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {assignment.evaluation.feedback ? (
                <div style={{ marginTop: "8px" }}>
                  <strong style={{ display: "block", marginBottom: "2px" }}>
                    Nhận xét từ Giảng viên:
                  </strong>
                  <div
                    style={{
                      background: "var(--color-surface)",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {assignment.evaluation.feedback}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section
            className="student-section-card"
            aria-labelledby="evaluation-heading"
          >
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
              Giảng viên đang chấm điểm trên LMS/Excel. Khi có kết quả chính
              thức, bạn sẽ nhận được thông báo qua email và xem chi tiết tại
              đây.
            </p>
          </section>
        )}
      </div>
    </Modal>
  );
}
