"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PinLoginForm } from "@/components/auth/student/pin-login-form";
import { GoogleSignInButton } from "@/components/auth/student/google-sign-in-button";
import { AuthCard } from "@/components/auth/auth-card";
import { IntentPrefetchLink as Link } from "@/components/ui/intent-prefetch-link";
import { Alert } from "@/components/ui/alert";
import type { PublicClassSectionDto } from "@/types/frontend-rebuild";

export function PublicClassView({
  code,
  initialSection,
}: {
  code: string;
  initialSection?: PublicClassSectionDto | null;
}) {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const hasInitialSection = initialSection !== undefined;
  const [section, setSection] = useState<PublicClassSectionDto | null>(
    initialSection ?? null,
  );

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (hasInitialSection) return;
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
  }, [code, hasInitialSection]);
  if (error || (hasInitialSection && !section))
    return (
      <AuthCard
        back={{
          fallbackHref: "/",
          ariaLabel: "Quay lại trang chủ",
          forceFallback: true,
        }}
        title="Mã lớp chưa đúng"
        context={
          <span className="form-error">
            {error ?? "Không tìm thấy lớp học phần"}
          </span>
        }
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
      <div className="form-stack">
        {oauthError ? (
          <div style={{ marginBottom: "8px" }}>
            <Alert variant="error">{oauthError}</Alert>
          </div>
        ) : null}

        <GoogleSignInButton classCode={section.code} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "4px 0",
            color: "var(--color-text-secondary)",
            fontSize: "0.8125rem",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--color-border)",
            }}
          />
          <span>hoặc dùng mã PIN</span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--color-border)",
            }}
          />
        </div>

        <PinLoginForm classCode={section.code} />
      </div>
    </AuthCard>
  );
}
