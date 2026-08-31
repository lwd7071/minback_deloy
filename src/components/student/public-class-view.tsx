"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PublicClassSectionDto } from "@/types/frontend-rebuild";
export function PublicClassView({ code }: { code: string }) {
  const router = useRouter();
  const [section, setSection] = useState<PublicClassSectionDto | null>(null);
  const [nickname, setNickname] = useState("");
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
    <Card className="stack">
      <span className="badge badge-info">{section.code}</span>
      <div>
        <p className="eyebrow">Lớp học phần</p>
        <h1>{section.name}</h1>
        <p className="muted">
          Nhập nickname đã được cấp trong lớp này để tiếp tục.
        </p>
      </div>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (nickname.trim())
            router.push(
              `/class/${encodeURIComponent(section.code)}/login?nickname=${encodeURIComponent(nickname.trim())}`,
            );
        }}
      >
        <label className="form-field">
          <span>Nickname</span>
          <input
            value={nickname}
            autoComplete="username"
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>
        <Button disabled={!nickname.trim()}>Tiếp tục →</Button>
      </form>
    </Card>
  );
}
