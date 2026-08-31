"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PinLoginForm } from "@/components/student/pin-login-form";
import type { PublicClassSectionDto } from "@/types/frontend-rebuild";
export function PublicClassView({ code }: { code: string }) {
  const router = useRouter();
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
      <Card>
        <p className="eyebrow">Không tìm thấy</p>
        <h1>Mã lớp chưa đúng</h1>
        <p className="form-error">{error}</p>
        <Link className="btn btn-secondary" href="/">
          Nhập lại mã lớp
        </Link>
      </Card>
    );
  if (!section)
    return (
      <Card>
        <p className="muted">Đang xác nhận lớp học phần…</p>
      </Card>
    );
  return (
    <Card 
      className="stack"
      style={{
        borderTop: "4px solid var(--primary)",
        background: "linear-gradient(145deg, #ffffff 0%, #f4f8fc 100%)",
        boxShadow: "0 10px 25px -5px rgba(49, 85, 245, 0.1), 0 8px 10px -6px rgba(49, 85, 245, 0.1)",
      }}
    >
      <div className="cluster">
        <span className="badge badge-info">{section.code}</span>
        <span className="eyebrow">Lớp học phần</span>
      </div>
      <div>
        <h1>{section.name}</h1>
        <p className="muted" style={{ marginTop: "4px" }}>
          Đăng nhập vào lớp học phần bằng Nickname và mã PIN.
        </p>
      </div>
      <PinLoginForm classCode={section.code} backUrl="/" />
    </Card>
  );
}
