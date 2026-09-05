"use client";
import { useEffect, useState } from "react";
import { PinLoginForm } from "@/components/auth/student/pin-login-form";
import { AuthCard } from "@/components/auth/auth-card";
import Link from "next/link";
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
      <AuthCard
        back={{
          fallbackHref: "/",
          ariaLabel: "Quay lại trang chủ",
          forceFallback: true,
        }}
        title="Mã lớp chưa đúng"
        context={<span className="form-error">{error}</span>}
      />
    );
  if (!section)
    return (
      <AuthCard
        back={{
          fallbackHref: "/",
          ariaLabel: "Quay lại trang chủ",
          forceFallback: true,
        }}
        title="Đang xác nhận lớp học phần"
      />
    );
  return (
    <AuthCard
      back={{
        fallbackHref: "/",
        ariaLabel: "Quay lại trang chủ",
        forceFallback: true,
      }}
      title="Đăng nhập"
      context={
        <span>
          <strong>{section.name}</strong>{" "}
          <span className="auth-class-code">{section.code}</span>
        </span>
      }
      footer={
        <Link
          className="auth-card-footer-link"
          href={`/class/${encodeURIComponent(section.code)}/forgot-pin`}
        >
          Quên mã PIN?
        </Link>
      }
    >
      <PinLoginForm classCode={section.code} />
    </AuthCard>
  );
}
