"use client";

import { useRef, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type {
  EvaluationImportPreviewDto,
  EvaluationImportResultDto,
  GradeImportModalProps,
} from "@/types/evaluation-import";

type ApiResult<T> = { data: T } | { error: { code?: string; message: string } };

export function GradeImportModal({
  open,
  onClose,
  assignmentId,
  maxScore,
  onSuccess,
}: GradeImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EvaluationImportPreviewDto | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  function resetState() {
    setFile(null);
    setPreview(null);
    setError(null);
    setPreviewBusy(false);
    setSubmitBusy(false);
    setConfirmPublish(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    if (previewBusy || submitBusy) return;
    resetState();
    onClose();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setError(null);
    setConfirmPublish(false);
  }

  async function inspectFile() {
    if (!file || previewBusy) return;
    setPreviewBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/evaluations/import-preview`,
        { method: "POST", body: formData },
      );
      const body = (await response.json()) as ApiResult<EvaluationImportPreviewDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error("error" in body ? body.error.message : "Không thể kiểm tra tệp");
      }
      setPreview(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lỗi kiểm tra tệp");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function executeImport(mode: "save_draft" | "publish") {
    if (!preview || submitBusy) return;

    const validRows = preview.rows.filter(
      (r) => r.status === "valid" && r.studentId,
    );

    if (validRows.length === 0) {
      setError("Không có dòng điểm nào hợp lệ để lưu");
      return;
    }

    setSubmitBusy(true);
    setError(null);

    try {
      const payload = {
        mode,
        evaluations: validRows.map((r) => ({
          studentId: r.studentId!,
          score: r.score,
          feedback: r.feedback ?? "",
        })),
      };

      const response = await fetch(
        `/api/v1/teacher/assignments/${assignmentId}/evaluations/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json()) as ApiResult<EvaluationImportResultDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error("error" in body ? body.error.message : "Không thể lưu điểm");
      }

      onSuccess(body.data);
      handleClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lỗi lưu bảng điểm");
      setSubmitBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nhập điểm & Nhận xét từ Excel"
      size="lg"
    >
      <div className="grade-import-modal-content">
        <p className="muted" style={{ marginTop: 0 }}>
          Hệ thống tự động nhận diện các cột: <strong>MSSV</strong>,{" "}
          <strong>Điểm</strong> (tối đa {maxScore}), và <strong>Nhận xét</strong>.
        </p>

        {/* Input file */}
        <div className="grade-import-picker">
          <input
            ref={fileInputRef}
            className="form-input"
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            disabled={previewBusy || submitBusy}
          />
          <Button
            type="button"
            loading={previewBusy}
            disabled={!file || submitBusy}
            onClick={() => void inspectFile()}
          >
            Kiểm tra tệp
          </Button>
        </div>

        {error ? (
          <div className="form-error" style={{ margin: "14px 0", padding: "10px 14px", borderRadius: "6px", background: "var(--danger-soft)" }} role="alert">
            {error}
          </div>
        ) : null}

        {/* Preview content */}
        {preview ? (
          <div className="grade-import-preview-box">
            <div className="preview-summary-grid" style={{ margin: "16px 0" }}>
              <div>
                <span className="muted">Tổng số dòng</span>
                <strong style={{ fontSize: "1.25rem" }}>{preview.summary.total}</strong>
              </div>
              <div>
                <span className="muted">Hợp lệ</span>
                <strong style={{ fontSize: "1.25rem", color: "var(--success)" }}>
                  {preview.summary.valid}
                </strong>
              </div>
              <div>
                <span className="muted">Bỏ qua / Lỗi</span>
                <strong style={{ fontSize: "1.25rem", color: preview.summary.skipped > 0 ? "var(--danger)" : "var(--text-disabled)" }}>
                  {preview.summary.skipped}
                </strong>
              </div>
            </div>

            <div className="table-wrap" style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Dòng</th>
                    <th>MSSV</th>
                    <th>Họ tên</th>
                    <th style={{ width: "80px" }}>Điểm</th>
                    <th>Nhận xét</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      style={{
                        background: row.status === "skipped" ? "var(--danger-soft)" : undefined,
                      }}
                    >
                      <td>{row.rowNumber}</td>
                      <td>
                        <strong>{row.mssv || "—"}</strong>
                      </td>
                      <td>{row.fullName || "—"}</td>
                      <td>
                        {row.score !== null ? (
                          <strong style={{ color: "var(--navy-900)" }}>{row.score}</strong>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.feedback ?? ""}>
                        {row.feedback || <span className="muted">—</span>}
                      </td>
                      <td>
                        {row.status === "valid" ? (
                          <span className="badge badge-success">Hợp lệ</span>
                        ) : (
                          <span className="badge badge-danger" title={row.errors?.map((e) => e.message).join(", ")}>
                            {row.errors?.[0]?.message || "Lỗi"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirmation when publishing */}
            {confirmPublish ? (
              <div className="form-notice" style={{ marginTop: "16px", borderColor: "var(--gold-500)" }}>
                <p>
                  <strong>Xác nhận công bố kết quả:</strong> Hệ thống sẽ chuyển trạng thái thành <strong>Đã công bố (returned)</strong> và gửi email thông báo kèm nhận xét tới <strong>{preview.summary.valid} sinh viên</strong> hợp lệ.
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <Button
                    type="button"
                    variant="primary"
                    loading={submitBusy}
                    onClick={() => void executeImport("publish")}
                  >
                    Xác nhận công bố
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={submitBusy}
                    onClick={() => setConfirmPublish(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="class-create-actions is-split" style={{ marginTop: "20px" }}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitBusy}
                  onClick={handleClose}
                >
                  Đóng
                </Button>
                <div className="button-group" style={{ display: "flex", gap: "10px" }}>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={submitBusy}
                    disabled={preview.summary.valid === 0}
                    onClick={() => void executeImport("save_draft")}
                  >
                    Lưu bản chấm (Nháp)
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={preview.summary.valid === 0 || submitBusy}
                    onClick={() => setConfirmPublish(true)}
                  >
                    Công bố kết quả
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
