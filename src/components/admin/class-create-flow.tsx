"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ClassSectionDto } from "@/types/class-section";
import type { ImportPreviewDto } from "@/types/frontend-rebuild";
import type { ImportResultDto } from "@/types/import";
export function ClassCreateFlow() {
  const router = useRouter();
  const [section, setSection] = useState<ClassSectionDto | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewDto | null>(null);
  const [result, setResult] = useState<ImportResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/teacher/class-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const body = await response.json();
      if (!response.ok || !body.data)
        throw new Error(body.error?.message ?? "Không thể tạo lớp");
      setSection(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo lớp");
    } finally {
      setBusy(false);
    }
  }
  async function upload(path: string) {
    if (!section || !file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(
        `/api/v1/teacher/class-sections/${section.id}/import${path}`,
        { method: "POST", body: form },
      );
      const body = await response.json();
      if (!response.ok || !body.data)
        throw new Error(body.error?.message ?? "Không thể đọc tệp");
      if (path === "/preview") setPreview(body.data);
      else setResult(body.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý tệp");
    } finally {
      setBusy(false);
    }
  }
  function downloadPins() {
    if (!result) return;
    const rows = result.rows
      .filter((row) => row.status === "created")
      .map((row) => `${row.initialNickname},${row.initialPin}`)
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`Nickname,PIN\n${rows}`], { type: "text/csv" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${section?.code ?? "class"}-pins.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="stack">
      <Card className="workflow-step">
        <div className="workflow-heading">
          <span className="step-number">1</span>
          <h2>Thông tin lớp</h2>
        </div>
        <form className="form-stack" onSubmit={(event) => void create(event)} autoComplete="off">
          <label className="form-field">
            <span>Mã lớp</span>
            <input
              value={code}
              autoComplete="off"
              disabled={Boolean(section)}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <label className="form-field">
            <span>Tên lớp</span>
            <input
              value={name}
              autoComplete="off"
              disabled={Boolean(section)}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <Button loading={busy} disabled={Boolean(section) || !code || !name}>
            Tạo lớp
          </Button>
        </form>
      </Card>
      {section ? (
        <Card className="workflow-step">
          <div className="workflow-heading">
            <span className="step-number">2</span>
            <h2>Danh sách sinh viên</h2>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
          />
          <div className="cluster">
            <Button
              variant="secondary"
              disabled={!file || busy}
              onClick={() => void upload("/preview")}
            >
              Xem trước
            </Button>
            {preview ? (
              <Button disabled={busy} onClick={() => void upload("")}>
                Xác nhận import
              </Button>
            ) : null}
          </div>
          {preview ? (
            <div className="stack">
              <p>
                <strong>{preview.summary.valid}</strong> hợp lệ ·{" "}
                <strong>{preview.summary.skipped}</strong> bỏ qua
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>MSSV</th>
                      <th>Họ tên</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 100).map((row) => (
                      <tr key={row.row}>
                        <td>{row.row}</td>
                        <td>{row.student?.mssv ?? "—"}</td>
                        <td>
                          {row.student?.fullName ?? row.errors?.[0]?.message}
                        </td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {result ? (
            <div className="form-notice">
              <p>
                Đã tạo {result.summary.created}, cập nhật{" "}
                {result.summary.updated}, bỏ qua {result.summary.skipped}.
              </p>
              <div className="cluster">
                <Button onClick={downloadPins}>Tải PIN một lần</Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/admin/classes/${section.id}`)}
                >
                  Đi tới lớp
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
