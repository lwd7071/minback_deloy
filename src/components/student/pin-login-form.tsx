"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
export function PinLoginForm({
  classCode,
  initialNickname = "",
  backUrl,
}: {
  classCode: string;
  initialNickname?: string;
  backUrl?: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryUntil, setRetryUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!retryUntil) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/student/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classCode, nickname, pin }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          const seconds = Number(response.headers.get("Retry-After") ?? 900);
          setRetryUntil(Date.now() + seconds * 1000);
        }
        throw new Error(
          body.error?.message ?? "Thông tin đăng nhập không chính xác",
        );
      }
      const session = body.data;
      router.replace(
        session.accessLevel === "credential_change" ||
          session.mustChangeNickname ||
          session.mustChangePin
          ? `/class/${encodeURIComponent(classCode)}/onboarding`
          : `/class/${encodeURIComponent(classCode)}/profile`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={(event) => void submit(event)}>
      <div className="form-field">
        <label className="form-label">Nickname</label>
        <input
          className="field-underline"
          autoComplete="username"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
      </div>
      <div className="form-field">
        <span className="form-label">PIN</span>
        <OtpInput
          value={pin}
          onChange={setPin}
          disabled={busy || remaining > 0}
        />
      </div>
      {remaining > 0 ? (
        <div className="auth-lockout">
          Sai thông tin đăng nhập. Thử lại sau {Math.ceil(remaining / 60)} phút.
        </div>
      ) : null}
      {error && remaining === 0 ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        loading={busy}
        disabled={!nickname.trim() || pin.length !== 6 || remaining > 0}
      >
        Đăng nhập
      </Button>
      <div className="split">
        <a href={backUrl || `/class/${encodeURIComponent(classCode)}`}>← Trở lại</a>
      </div>
    </form>
  );
}
