"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export type StudentAddModalProps = {
  open: boolean;
  onClose: () => void;
  classSectionId: string;
  onSuccess: () => void;
};

export function StudentAddModal({
  open,
  onClose,
  classSectionId,
  onSuccess,
}: StudentAddModalProps) {
  const { push: toast } = useToast();
  const [mssv, setMssv] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setMssv("");
    setFullName("");
    setEmail("");
    setError(null);
    setBusy(false);
  }

  function handleClose() {
    if (busy) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mssv.trim() || !fullName.trim()) {
      setError("Vui lòng nhập MSSV và Họ tên sinh viên");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const csv =
        "\uFEFFMSSV,Họ Tên,Email\n" +
        `"${mssv.trim()}","${fullName.trim()}","${email.trim()}"\n`;
      const file = new File([csv], "student.csv", {
        type: "text/csv;charset=utf-8",
      });

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
        };
        error?: { message?: string };
      };

      if (!res.ok || !body.data) {
        throw new Error(body.error?.message ?? "Không thể thêm sinh viên");
      }

      toast("Đã thêm sinh viên thành công!", "success");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm sinh viên thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Thêm sinh viên vào lớp"
      size="sm"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="dialog-form"
        autoComplete="off"
      >
        <div>
          <label className="form-label">Mã số sinh viên (MSSV) *</label>
          <input
            type="text"
            className="form-input"
            required
            autoComplete="off"
            placeholder="VD: 21110001"
            value={mssv}
            onChange={(e) => setMssv(e.target.value)}
            disabled={busy}
          />
        </div>

        <div>
          <label className="form-label">Họ và tên *</label>
          <input
            type="text"
            className="form-input"
            required
            autoComplete="off"
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={busy}
          />
        </div>

        <div>
          <label className="form-label">Email (tùy chọn)</label>
          <input
            type="email"
            className="form-input"
            autoComplete="off"
            placeholder="VD: 21110001@student.hcmute.edu.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </div>

        <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
          Sinh viên mới sẽ đăng nhập bằng MSSV và mã PIN mặc định là{" "}
          <strong>111111</strong>.
        </p>

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
          <Button type="submit" variant="primary" loading={busy}>
            Thêm sinh viên
          </Button>
        </div>
      </form>
    </Modal>
  );
}
