"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { classSectionCreateSchema } from "@/schemas/class-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { ClassSectionSetupDto } from "@/types/class-section";
import type { ImportPreviewDto } from "@/types/frontend-rebuild";

type CreateClassStep = "details" | "roster" | "review" | "complete";
type ApiResult<T> = { data: T } | { error: { code?: string; message: string } };

const STEPS: Array<{ id: CreateClassStep; label: string }> = [
  { id: "details", label: "Thông tin lớp" },
  { id: "roster", label: "Danh sách sinh viên" },
  { id: "review", label: "Xác nhận" },
  { id: "complete", label: "Hoàn tất" },
];

function stepIndex(step: CreateClassStep): number {
  return STEPS.findIndex((item) => item.id === step);
}

export function ClassCreateFlow() {
  const router = useRouter();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const previewControllerRef = useRef<AbortController | null>(null);
  const previewSequenceRef = useRef(0);
  const [step, setStep] = useState<CreateClassStep>("details");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewDto | null>(null);
  const [skipRoster, setSkipRoster] = useState(false);
  const [result, setResult] = useState<ClassSectionSetupDto | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => previewControllerRef.current?.abort();
  }, []);

  function continueDetails(event: React.FormEvent) {
    event.preventDefault();
    const parsed = classSectionCreateSchema.safeParse({ code, name });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      codeInputRef.current?.focus();
      return;
    }
    setCode(parsed.data.code);
    setName(parsed.data.name);
    setFieldErrors({});
    setError(null);
    setStep("roster");
  }

  function changeFile(nextFile: File | null) {
    previewControllerRef.current?.abort();
    previewSequenceRef.current += 1;
    setFile(nextFile);
    setPreview(null);
    setSkipRoster(false);
    setError(null);
    setPreviewBusy(false);
  }

  async function inspectFile() {
    if (!file || previewBusy) return;
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    const sequence = previewSequenceRef.current + 1;
    previewSequenceRef.current = sequence;
    previewControllerRef.current = controller;
    setPreviewBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(
        "/api/v1/teacher/class-section-import-previews",
        { method: "POST", body: formData, signal: controller.signal },
      );
      const body = (await response.json()) as ApiResult<ImportPreviewDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể kiểm tra tệp",
        );
      }
      if (previewSequenceRef.current === sequence) setPreview(body.data);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error ? cause.message : "Không thể kiểm tra tệp",
        );
      }
    } finally {
      if (previewSequenceRef.current === sequence) setPreviewBusy(false);
      if (previewControllerRef.current === controller) {
        previewControllerRef.current = null;
      }
    }
  }

  function continueWithoutRoster() {
    changeFile(null);
    setSkipRoster(true);
    setStep("review");
  }

  async function createClassSection() {
    if (submitBusy || result) return;
    setSubmitBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("code", code);
      formData.set("name", name);
      if (!skipRoster && file) formData.set("file", file);
      const response = await fetch("/api/v1/teacher/class-section-setups", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiResult<ClassSectionSetupDto>;
      if (!response.ok || !("data" in body)) {
        if (
          response.status === 409 &&
          "error" in body &&
          body.error.code === "CONFLICT"
        ) {
          setFieldErrors({ code: body.error.message });
          setStep("details");
          window.setTimeout(() => codeInputRef.current?.focus(), 0);
          return;
        }
        throw new Error(
          "error" in body ? body.error.message : "Không thể tạo lớp",
        );
      }
      setResult(body.data);
      setStep("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo lớp");
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div className="class-create-wizard">
      <ol className="class-create-stepper" aria-label="Tiến trình tạo lớp">
        {STEPS.map((item, index) => {
          const current = item.id === step;
          const complete = index < stepIndex(step);
          return (
            <li
              className={`${current ? "is-current" : ""} ${complete ? "is-complete" : ""}`}
              key={item.id}
              aria-current={current ? "step" : undefined}
            >
              <span>{complete ? "✓" : index + 1}</span>
              <strong>{item.label}</strong>
            </li>
          );
        })}
      </ol>

      {step === "details" ? (
        <Card className="class-create-stage">
          <p className="eyebrow">Bước 1 / 4</p>
          <h2>Đặt thông tin nhận diện lớp</h2>
          <p className="muted">Chưa có dữ liệu nào được tạo ở bước này.</p>
          <form className="form-stack" onSubmit={continueDetails}>
            <label className="form-field">
              <span className="form-label">Mã lớp</span>
              <input
                ref={codeInputRef}
                className="form-input"
                value={code}
                aria-invalid={Boolean(fieldErrors.code)}
                aria-describedby={
                  fieldErrors.code ? "class-code-error" : undefined
                }
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setFieldErrors((current) => ({ ...current, code: "" }));
                }}
                autoComplete="off"
              />
              {fieldErrors.code ? (
                <small className="form-error" id="class-code-error">
                  {fieldErrors.code}
                </small>
              ) : null}
            </label>
            <label className="form-field">
              <span className="form-label">Tên lớp</span>
              <input
                className="form-input"
                value={name}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={
                  fieldErrors.name ? "class-name-error" : undefined
                }
                onChange={(event) => {
                  setName(event.target.value);
                  setFieldErrors((current) => ({ ...current, name: "" }));
                }}
              />
              {fieldErrors.name ? (
                <small className="form-error" id="class-name-error">
                  {fieldErrors.name}
                </small>
              ) : null}
            </label>
            <div className="class-create-actions">
              <Button type="submit">Tiếp tục</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {step === "roster" ? (
        <Card className="class-create-stage">
          <p className="eyebrow">Bước 2 / 4</p>
          <h2>Chuẩn bị danh sách sinh viên</h2>
          <p className="muted">
            CSV/XLSX cần có cột MSSV, Họ Tên; Email là tùy chọn.
          </p>
          <label className="class-create-file">
            <span className="form-label">Tệp danh sách</span>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => changeFile(event.target.files?.[0] ?? null)}
            />
            <small>
              {file
                ? `${file.name} · ${Math.ceil(file.size / 1024)} KB`
                : "Tối đa 5 MB và 2.000 dòng dữ liệu"}
            </small>
          </label>
          <div className="class-create-actions is-split">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setStep("details")}
            >
              Quay lại
            </Button>
            <div className="cluster">
              <Button
                variant="secondary"
                type="button"
                onClick={continueWithoutRoster}
              >
                Bỏ qua, thêm sau
              </Button>
              <Button
                type="button"
                loading={previewBusy}
                disabled={!file}
                onClick={() => void inspectFile()}
              >
                Kiểm tra tệp
              </Button>
            </div>
          </div>
          {preview ? (
            <div className="class-create-preview">
              <div className="class-create-stats">
                <span>
                  <strong>{preview.summary.total}</strong>Tổng dòng
                </span>
                <span>
                  <strong>{preview.summary.valid}</strong>Hợp lệ
                </span>
                <span>
                  <strong>{preview.summary.skipped}</strong>Bỏ qua
                </span>
              </div>
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
                        <td>
                          <span
                            className={`status-text ${row.status === "valid" ? "status-success" : "status-warning"}`}
                          >
                            {row.status === "valid" ? "Hợp lệ" : "Bỏ qua"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 100 ? (
                <p className="muted">Đang hiển thị 100 dòng đầu tiên.</p>
              ) : null}
              {preview.summary.valid === 0 ? (
                <p className="form-error">
                  Tệp chưa có sinh viên hợp lệ. Hãy đổi tệp hoặc chọn thêm sinh
                  viên sau.
                </p>
              ) : null}
              <div className="class-create-actions">
                <Button
                  type="button"
                  disabled={preview.summary.valid === 0}
                  onClick={() => setStep("review")}
                >
                  Tiếp tục xác nhận
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {step === "review" ? (
        <Card className="class-create-stage">
          <p className="eyebrow">Bước 3 / 4</p>
          <h2>Kiểm tra trước khi tạo</h2>
          <div className="class-create-review">
            <section>
              <span>Thông tin lớp</span>
              <strong>{code}</strong>
              <p>{name}</p>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setStep("details")}
              >
                Chỉnh sửa
              </Button>
            </section>
            <section>
              <span>Danh sách sinh viên</span>
              <strong>
                {skipRoster
                  ? "Thêm sau"
                  : `${preview?.summary.valid ?? 0} sinh viên hợp lệ`}
              </strong>
              <p>
                {skipRoster
                  ? "Lớp sẽ được tạo chưa có sinh viên."
                  : `${preview?.summary.skipped ?? 0} dòng bị bỏ qua từ ${file?.name ?? "tệp đã chọn"}.`}
              </p>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setStep("roster")}
              >
                Chỉnh sửa
              </Button>
            </section>
          </div>
          <Alert variant="info">
            Lớp và sinh viên chỉ được ghi vào hệ thống sau khi bạn xác nhận bên
            dưới. Sinh viên mới dùng MSSV và PIN mặc định 111111.
          </Alert>
          <div className="class-create-actions is-split">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setStep("roster")}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              loading={submitBusy}
              onClick={() => void createClassSection()}
            >
              {skipRoster
                ? "Tạo lớp không có sinh viên"
                : `Tạo lớp và thêm ${preview?.summary.valid ?? 0} sinh viên`}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "complete" && result ? (
        <Card className="class-create-stage class-create-complete">
          <span className="class-create-success" aria-hidden="true">
            ✓
          </span>
          <p className="eyebrow">Bước 4 / 4</p>
          <h2>Đã tạo lớp {result.classSection.code}</h2>
          <p>{result.classSection.name}</p>
          {result.import ? (
            <p className="muted">
              Đã thêm {result.import.summary.created} sinh viên · Bỏ qua{" "}
              {result.import.summary.skipped} dòng.
            </p>
          ) : (
            <p className="muted">
              Bạn có thể thêm sinh viên từ trang quản lý lớp.
            </p>
          )}
          {(result.import?.summary.created ?? 0) > 0 ? (
            <Alert variant="info">
              <p>
                Sinh viên có thể đăng nhập bằng <strong>MSSV</strong> và mã PIN
                mặc định <strong>111111</strong> trong lần đầu tiên.
              </p>
            </Alert>
          ) : null}
          <div className="class-create-actions">
            <Button
              type="button"
              onClick={() =>
                router.push(`/admin/classes/${result.classSection.id}`)
              }
            >
              Đi tới lớp
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <p className="form-error class-create-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
