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
  const [confirmSkipInvalid, setConfirmSkipInvalid] = useState(false);

  function resetState() {
    setFile(null);
    setPreview(null);
    setError(null);
    setPreviewBusy(false);
    setSubmitBusy(false);
    setConfirmPublish(false);
    setConfirmSkipInvalid(false);
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
    setConfirmSkipInvalid(false);
    if (selected) {
      void inspectFile(selected);
    }
  }

  async function inspectFile(fileToInspect?: File | null) {
    const targetFile = fileToInspect ?? file;
    if (!targetFile || previewBusy) return;
    setPreviewBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", targetFile);
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
        criteria: preview.criteria,
        evaluations: validRows.map((r) => ({
          studentId: r.studentId!,
          score: r.score,
          feedback: r.feedback ?? "",
          criteriaScores: r.criteriaScores,
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
        <div
          className="grade-import-picker"
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
        >
          <input
            ref={fileInputRef}
            className="form-input"
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            disabled={previewBusy || submitBusy}
          />
          {previewBusy ? (
            <span
              className="status-text muted"
              style={{ fontSize: "0.88rem", whiteSpace: "nowrap" }}
              aria-live="polite"
            >
              Đang kiểm tra tệp…
            </span>
          ) : null}
        </div>

        {error ? (
          <div
            className="form-error"
            style={{
              margin: "14px 0",
              padding: "10px 14px",
              borderRadius: "6px",
              background: "var(--color-error-soft)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
            role="alert"
          >
            <span>{error}</span>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                disabled={previewBusy}
                onClick={() => void inspectFile(file)}
                style={{ padding: "4px 8px", fontSize: "0.85rem" }}
              >
                Thử lại
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Preview content */}
        {preview ? (
          <div>
            {/* File-level Warnings (ghi đè kết quả, đổi tiêu chí) */}
            {preview.warnings && preview.warnings.length > 0 ? (
              <div
                className="form-notice"
                style={{
                  margin: "12px 0",
                  borderColor: "var(--color-warning)",
                  backgroundColor: "var(--color-warning-soft)",
                  color: "var(--color-text-primary)",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "0.88rem",
                }}
              >
                {preview.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "flex-start",
                      marginBottom: idx < preview.warnings!.length - 1 ? "6px" : 0,
                    }}
                  >
                    <span>{w.field === "criteria" ? "🚨" : "⚠️"}</span>
                    <div>
                      {w.field === "criteria" ? (
                        <strong style={{ color: "var(--color-warning)" }}>
                          Cảnh báo thay đổi tiêu chí:{" "}
                        </strong>
                      ) : null}
                      <span>{w.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Tiêu chí nhận diện (Rubric Chips) */}
            {preview.criteria && preview.criteria.length > 0 ? (
              <div
                style={{
                  margin: "12px 0 16px 0",
                  padding: "10px 14px",
                  background: "var(--color-surface-elevated, #f8fafc)",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>
                  TIÊU CHÍ CHẤM ĐIỂM ĐÃ NHẬN DIỆN ({preview.criteria.length} tiêu chí • Tổng 100%)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {preview.criteria.map((c, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        borderRadius: "4px",
                        backgroundColor: "var(--color-secondary, #e2e8f0)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {c.name}: {c.weight}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <ImportPreviewTable rows={preview.rows} />

            {/* Cảnh báo khi có dòng lỗi (Invalid rows) */}
            {preview.summary.invalid > 0 ? (
              <div
                className="form-notice"
                style={{
                  margin: "14px 0",
                  borderColor: "var(--color-error)",
                  backgroundColor: "var(--color-error-soft)",
                  color: "var(--color-text-primary)",
                  padding: "12px 14px",
                  borderRadius: "6px",
                  fontSize: "0.88rem",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--color-error)",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>⚠️</span>
                  <span>
                    Tệp có {preview.summary.invalid} dòng bị lỗi không thể lưu:
                  </span>
                </div>
                <p style={{ margin: "0 0 10px 0", color: "var(--color-text-secondary)" }}>
                  Các dòng lỗi được tô đỏ ở bảng trên sẽ <strong>không được lưu</strong> vào bảng điểm. Bạn nên sửa lại tệp Excel theo các hướng dẫn lỗi ở bảng rồi tải lại, hoặc tích vào ô bên dưới nếu bạn chỉ muốn lưu {preview.summary.valid} dòng hợp lệ.
                </p>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmSkipInvalid}
                    onChange={(e) => setConfirmSkipInvalid(e.target.checked)}
                  />
                  <span>
                    Tôi xác nhận bỏ qua {preview.summary.invalid} dòng lỗi và chỉ lưu {preview.summary.valid} dòng hợp lệ
                  </span>
                </label>
              </div>
            ) : null}

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
                    disabled={preview.summary.valid === 0 || submitBusy || (preview.summary.invalid > 0 && !confirmSkipInvalid)}
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
                    disabled={preview.summary.valid === 0 || submitBusy || (preview.summary.invalid > 0 && !confirmSkipInvalid)}
                    onClick={() => void executeImport("save_draft")}
                  >
                    Lưu chưa công bố
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={preview.summary.valid === 0 || submitBusy || (preview.summary.invalid > 0 && !confirmSkipInvalid)}
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
