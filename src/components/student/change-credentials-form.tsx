"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  student: { mssv: string; fullName: string; nickname: string };
  accessLevel: string;
  mustChangeNickname: boolean;
  mustChangePin: boolean;
  expiresAt: string;
};

type ApiResult<T> = { data: T } | { error: { code: string; message: string } };

async function readResult<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok || !("data" in body)) {
    throw new Error("error" in body ? body.error.message : "Yêu cầu thất bại");
  }
  return body.data;
}

export function ChangeCredentialsForm() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session để biết cần đổi gì
  useEffect(() => {
    let active = true;
    fetch("/api/v1/student/auth/session", { cache: "no-store" })
      .then((r) => readResult<Session>(r))
      .then((data) => {
        if (!active) return;
        setSession(data);
        // Nếu session đã full (đổi đủ rồi) → redirect thẳng vào profile
        if (
          data.accessLevel === "full" &&
          !data.mustChangeNickname &&
          !data.mustChangePin
        ) {
          router.replace("/student/profile");
        }
      })
      .catch(() => {
        if (active) router.replace("/student/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate PIN xác nhận
    if (session?.mustChangePin && pin !== pinConfirm) {
      setError("PIN xác nhận không khớp. Vui lòng nhập lại.");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (session?.mustChangeNickname && nickname.trim())
        body.nickname = nickname.trim();
      if (session?.mustChangePin && pin) body.pin = pin;

      const response = await fetch("/api/v1/student/auth/credentials", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const updated = await readResult<Session>(response);

      // Nếu đã đổi đủ → vào profile
      if (updated.accessLevel === "full") {
        router.push("/student/profile");
        router.refresh();
      } else {
        // Cập nhật lại session state (còn cờ chưa đổi)
        setSession(updated);
        setNickname("");
        setPin("");
        setPinConfirm("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật thông tin",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="muted">Đang tải thông tin…</p>;
  }

  if (!session) return null;

  const needNickname = session.mustChangeNickname;
  const needPin = session.mustChangePin;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="login-form"
      noValidate
    >
      <div className="form-notice" role="note">
        <p>
          Để bảo mật tài khoản, bạn cần{" "}
          {needNickname && needPin
            ? "đặt Nickname mới và PIN mới"
            : needNickname
              ? "đặt Nickname mới"
              : "đặt PIN mới"}{" "}
          trước khi vào hồ sơ học tập.
        </p>
      </div>

      {needNickname && (
        <div className="form-field">
          <label htmlFor="new-nickname" className="form-label">
            Nickname mới
          </label>
          <p className="muted form-label-hint">
            3–50 ký tự, chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch
            ngang.
          </p>
          <input
            id="new-nickname"
            type="text"
            className="form-input"
            placeholder="Đặt nickname của bạn"
            autoComplete="username"
            spellCheck={false}
            required
            disabled={busy}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
      )}

      {needPin && (
        <>
          <div className="form-field">
            <label htmlFor="new-pin" className="form-label">
              PIN mới (6 chữ số)
            </label>
            <input
              id="new-pin"
              type="password"
              className="form-input"
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              required
              disabled={busy}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirm-pin" className="form-label">
              Xác nhận PIN mới
            </label>
            <input
              id="confirm-pin"
              type="password"
              className="form-input"
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              required
              disabled={busy}
              value={pinConfirm}
              onChange={(e) =>
                setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>
        </>
      )}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        id="change-credentials-submit"
        type="submit"
        className="button login-button"
        disabled={
          busy ||
          (needNickname && nickname.trim().length < 3) ||
          (needPin && pin.length !== 6) ||
          (needPin && pinConfirm.length !== 6)
        }
      >
        {busy ? "Đang lưu…" : "Xác nhận và tiếp tục"}
      </button>
    </form>
  );
}
