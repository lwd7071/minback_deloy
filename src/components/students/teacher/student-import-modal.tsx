"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export type StudentImportModalProps = {
  open: boolean;
  onClose: () => void;
  classSectionId: string;
  onSuccess: () => void;
};

export function StudentImportModal({
  open,
  onClose,
  classSectionId,
  onSuccess,
}: StudentImportModalProps) {
  const { push: toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setFile(null);
    setError(null);
    setBusy(false);
  }

  function handleClose() {
    if (busy) return;
    resetState();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn tệp CSV hoặc Excel");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/import`,
        {
          method: "POST",
          body: formData,
        },
      );

      const body = (await res.json()) as {
        data?: {
          importedRows: number;
          updatedRows: number;
          validRows: number;
          totalRows: number;
        };
        error?: { message?: string };
      };

      if (!res.ok || !body.data) {
        throw new Error(body.error?.message ?? "Nhập danh sách thất bại");
      }

      toast(
        `Nhập thành công: ${body.data.importedRows} sinh viên mới, ${body.data.updatedRows} cập nhật.`,
        "success",
      );
      resetState();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nhập danh sách thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nhập danh sách sinh viên từ file"
      size="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="dialog-form">
        <p className="muted dialog-copy">
          Hỗ trợ file Excel (<strong>.xlsx</strong>) hoặc <strong>.csv</strong>.
          Cần có cột <strong>MSSV</strong>, <strong>Họ Tên</strong> (Email là tùy
          chọn). Sinh viên mới dùng PIN mặc định <strong>111111</strong>.
        </p>

        <div style={{ margin: "16px 0" }}>
          <input
            type="file"
            accept=".csv,.xlsx"
            required
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          {file ? (
            <p className="muted" style={{ marginTop: "8px", fontSize: "13px" }}>
              Đã chọn: <strong>{file.name}</strong> (
              {Math.ceil(file.size / 1024)} KB)
            </p>
          ) : null}
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={handleClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={busy}
            disabled={!file}
          >
            Tiến hành nhập
          </Button>
        </div>
      </form>
    </Modal>
  );
}
