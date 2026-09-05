"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ImportPreviewTable } from "@/components/evaluations/teacher/import-preview-table";
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
  onSuccess,
}: GradeImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EvaluationImportPreviewDto | null>(
    null,
  );
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
      const body =
        (await response.json()) as ApiResult<EvaluationImportPreviewDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể kiểm tra tệp",
        );
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

      const body =
        (await response.json()) as ApiResult<EvaluationImportResultDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể lưu điểm",
        );
      }

      onSuccess(body.data);
      resetState();
      onClose();
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
          Tệp cần có đúng 4 cột: <strong>MSSV</strong>, <strong>Họ tên</strong>,{" "}
          <strong>Điểm</strong> (thang 10), và <strong>Feedback</strong>.
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
          <div
            className="form-error"
            style={{
              margin: "14px 0",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "var(--color-error-soft)",
            }}
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {/* Preview content */}
        {preview ? (
          <div className="grade-import-preview-box">
            <div className="preview-summary-grid">
              <div>
                <span className="muted">Tạo mới</span>
                <strong>{preview.summary.create ?? 0}</strong>
              </div>
              <div>
                <span className="muted">Cập nhật</span>
                <strong>{preview.summary.update ?? 0}</strong>
              </div>
              <div>
                <span className="muted">Không đổi</span>
                <strong>{preview.summary.unchanged ?? 0}</strong>
              </div>
              <div>
                <span className="muted">Lỗi</span>
                <strong
                  className={preview.summary.invalid > 0 ? "text-danger" : ""}
                >
                  {preview.summary.invalid}
                </strong>
              </div>
            </div>

            <ImportPreviewTable rows={preview.rows} />

            {/* Confirmation when publishing */}
            {confirmPublish ? (
              <div
                className="form-notice"
                style={{
                  marginTop: "16px",
                  borderColor: "var(--color-accent)",
                }}
              >
                <p>
                  <strong>Xác nhận công bố kết quả:</strong> Hệ thống sẽ chuyển
                  trạng thái thành <strong>Đã công bố (returned)</strong> và gửi
                  email thông báo kèm nhận xét tới{" "}
                  <strong>{preview.summary.valid} sinh viên</strong> hợp lệ.
                </p>
                <div
                  style={{ display: "flex", gap: "10px", marginTop: "10px" }}
                >
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
              <div
                className="class-create-actions is-split"
                style={{ marginTop: "20px" }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitBusy}
                  onClick={handleClose}
                >
                  Đóng
                </Button>
                <div
                  className="button-group"
                  style={{ display: "flex", gap: "10px" }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    loading={submitBusy}
                    disabled={preview.summary.valid === 0}
                    onClick={() => void executeImport("save_draft")}
                  >
                    Lưu chưa công bố
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
