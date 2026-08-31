"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ClassSectionDto } from "@/types/class-section";
import type { ImportResultDto } from "@/types/import";

type ApiResult<T> = { data: T } | { error: { message: string } };

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadInitialCredentials(result: ImportResultDto): void {
  const rows = result.rows.filter(
    (
      row,
    ): row is typeof row & { initialNickname: string; initialPin: string } =>
      row.status === "created" &&
      typeof row.initialNickname === "string" &&
      typeof row.initialPin === "string",
  );
  const csv = [
    "Nickname,PIN",
    ...rows.map(
      (row) => `${escapeCsv(row.initialNickname)},${escapeCsv(row.initialPin)}`,
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "initial-student-pins.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ClassSectionDetailView({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState<ClassSectionDto | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          `/api/v1/teacher/class-sections/${classSectionId}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as ApiResult<ClassSectionDto>;
        if (!response.ok || !("data" in body))
          throw new Error(
            "error" in body ? body.error.message : "Không thể tải lớp",
          );
        setSection(body.data);
        setCode(body.data.code);
        setName(body.data.name);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không thể tải lớp");
      } finally {
        setLoading(false);
      }
    })();
  }, [classSectionId]);

  async function updateSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, name }),
        },
      );
      const body = (await response.json()) as ApiResult<ClassSectionDto>;
      if (!response.ok || !("data" in body))
        throw new Error(
          "error" in body ? body.error.message : "Không thể cập nhật lớp",
        );
      setSection(body.data);
      setCode(body.data.code);
      setName(body.data.name);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể cập nhật lớp",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSection() {
    if (!window.confirm("Xóa lớp học phần này?")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = (await response.json()) as ApiResult<never>;
        throw new Error(
          "error" in body ? body.error.message : "Không thể xóa lớp",
        );
      }
      router.push("/teacher/class-sections");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa lớp");
      setBusy(false);
    }
  }

  async function importStudents(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportBusy(true);
    setImportMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/class-sections/${classSectionId}/import`,
        { method: "POST", body: new FormData(event.currentTarget) },
      );
      const body = (await response.json()) as ApiResult<ImportResultDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body
            ? body.error.message
            : "Không thể import danh sách sinh viên",
        );
      }
      if (body.data.summary.created > 0) downloadInitialCredentials(body.data);
      event.currentTarget.reset();
      setImportMessage(
        `Đã tạo ${body.data.summary.created}, cập nhật ${body.data.summary.updated}, bỏ qua ${body.data.summary.skipped}/${body.data.summary.total} dòng.${body.data.summary.created > 0 ? " File PIN khởi tạo đã được tải xuống; không thể tải lại từ hệ thống." : ""}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể import danh sách sinh viên",
      );
    } finally {
      setImportBusy(false);
    }
  }

  if (loading)
    return (
      <section className="surface">
        <p className="muted">Đang tải...</p>
      </section>
    );
  if (!section)
    return (
      <section className="surface">
        <p className="form-error">{error ?? "Không tìm thấy lớp"}</p>
      </section>
    );

  return (
    <section className="surface">
      <p className="eyebrow">Dev A</p>
      <h1>{section.code}</h1>
      <p className="muted">Chỉnh sửa thông tin lớp học phần.</p>
      <form className="login-form" onSubmit={updateSection}>
        <label className="form-field">
          <span className="form-label">Mã lớp</span>
          <input
            className="form-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span className="form-label">Tên lớp</span>
          <input
            className="form-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <button className="button" disabled={busy} type="submit">
          Lưu thay đổi
        </button>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={deleteSection}
          type="button"
        >
          Xóa lớp
        </button>
      </form>
      <form className="login-form" onSubmit={importStudents}>
        <h2>Import sinh viên</h2>
        <p className="muted">
          Tải CSV/XLSX có cột MSSV, Họ Tên và Email (tùy chọn). PIN khởi tạo chỉ
          được tạo một lần và tải trực tiếp trên trình duyệt này.
        </p>
        <label className="form-field">
          <span className="form-label">Tệp CSV hoặc XLSX</span>
          <input
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="form-input"
            name="file"
            required
            type="file"
          />
        </label>
        <button className="button" disabled={importBusy} type="submit">
          {importBusy ? "Đang import..." : "Import và tải PIN"}
        </button>
        {importMessage ? <p className="muted">{importMessage}</p> : null}
      </form>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
