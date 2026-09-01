"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PinLoginForm } from "@/components/auth/student/pin-login-form";
import type { PublicClassSectionDto } from "@/types/frontend-rebuild";
export function PublicClassView({ code }: { code: string }) {
  const [section, setSection] = useState<PublicClassSectionDto | null>(null);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/public/class-sections/${encodeURIComponent(code)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data)
          throw new Error(body.error?.message ?? "Không tìm thấy lớp học phần");
        return body.data as PublicClassSectionDto;
      })
      .then((data) => {
        if (active) setSection(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải lớp",
          );
      });
    return () => {
      active = false;
    };
  }, [code]);
  if (error)
    return (
      <section className="public-record-card">
        <p className="eyebrow">Không tìm thấy</p>
        <h1>Mã lớp chưa đúng</h1>
        <p className="form-error">{error}</p>
        <Link className="btn btn-secondary" href="/">
          Nhập lại mã lớp
        </Link>
      </section>
    );
  if (!section)
    return (
      <section className="public-record-card">
        <p className="muted">Đang xác nhận lớp học phần…</p>
      </section>
    );
  return (
    <section className="public-record-card stack">
      <div className="auth-heading">
        <p className="auth-eyebrow">Đăng nhập</p>
        <h2 className="auth-title" style={{ marginTop: 0, marginBottom: "4px" }}>{section.name}</h2>
        <p className="auth-class" style={{ marginTop: 0 }}>Mã lớp: {section.code}</p>
      </div>
      <PinLoginForm classCode={section.code} backUrl="/" />
    </section>
  );
}
