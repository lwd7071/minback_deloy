"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ClassSectionDto } from "@/types/class-section";

type ApiResult<T> =
  { data: T; meta?: { total: number } } | { error: { message: string } };

export function ClassSectionManagementView() {
  const [sections, setSections] = useState<ClassSectionDto[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSections() {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/v1/teacher/class-sections?page=1&pageSize=100",
        {
          cache: "no-store",
        },
      );
      const body = (await response.json()) as ApiResult<ClassSectionDto[]>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể tải lớp học phần",
        );
      }
      setSections(body.data);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải lớp học phần",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSections();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/teacher/class-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const body = (await response.json()) as ApiResult<ClassSectionDto>;
      if (!response.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể tạo lớp học phần",
        );
      }
      setCode("");
      setName("");
      await loadSections();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tạo lớp học phần",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface">
      <p className="eyebrow">Dev A</p>
      <h1>Class sections</h1>
      <p className="muted">
        Quản lý lớp học phần và import danh sách sinh viên.
      </p>

      <form className="login-form" onSubmit={createSection}>
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
          {busy ? "Đang tạo..." : "Tạo lớp"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted">Đang tải...</p> : null}
      {!loading && sections.length === 0 ? (
        <p className="muted">Chưa có lớp học phần.</p>
      ) : null}
      <div className="route-list">
        {sections.map((section) => (
          <Link
            className="route-card"
            href={`/teacher/class-sections/${section.id}`}
            key={section.id}
          >
            <strong>{section.code}</strong>
            <span className="muted">{section.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
