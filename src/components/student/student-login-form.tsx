"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiResult<T> = { data: T } | { error: { code: string; message: string } };

async function readResult<T>(response: Response): Promise<T> { // hàm hỗ trợ đọc json và kiểm tra lỗi có 2 trạng thái success và error
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok || !("data" in body)) {
    throw new Error("error" in body ? body.error.message : "Yêu cầu thất bại");
  }
  return body.data;
}

export function StudentLoginForm() {
  const router = useRouter();

  const [classCode, setClassCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Ngăn trình duyệt reload trang mạc đinh khi submit
    setError(null);
    setBusy(true);

    try {
      // gửi data lên api backend 
      const response = await fetch("/api/v1/student/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classCode, nickname, pin }),
      });

      // đọc kq response từ backend trả về
      const session = await readResult<{
        accessLevel: string;
        mustChangeNickname: boolean;
        mustChangePin: boolean;
      }>(response);

      // Nếu cần đổi thông tin lần đầu → chuyển sang trang đổi credentials
      if (
        session.accessLevel === "credential_change" ||
        session.mustChangeNickname ||
        session.mustChangePin
      ) {
        router.push("/student/change-credentials");
      } else {
        router.push("/student/profile");
        router.refresh();
      }
    } catch (err) {
      // nếu api báo lỗi thì vô đây hiển thị lỗi cho người dùng 
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="login-form"
      noValidate
    >
      <div className="form-field">
        <label htmlFor="classCode" className="form-label">
          Mã lớp học phần
        </label>
        <input
          id="classCode"
          type="text"
          className="form-input"
          placeholder="VD: WEB101_01"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          required
          disabled={busy}
          value={classCode}
          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
        />
      </div>

      <div className="form-field">
        <label htmlFor="nickname" className="form-label">
          Nickname
        </label>
        <input
          id="nickname"
          type="text"
          className="form-input"
          placeholder="Nickname của bạn trong lớp"
          autoComplete="username"
          spellCheck={false}
          required
          disabled={busy}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="pin" className="form-label">
          PIN (6 chữ số)
        </label>
        <input
          id="pin"
          type="password"
          className="form-input"
          placeholder="••••••"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          pattern="\d{6}"
          required
          disabled={busy}
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        id="login-submit"
        type="submit"
        className="button login-button"
        disabled={
          busy ||
          classCode.trim() === "" ||
          nickname.trim() === "" ||
          pin.length !== 6
        }
      >
        {busy ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <p className="muted login-hint">
        Quên PIN? Liên hệ Giáo viên/Admin để được cấp lại.
      </p>
    </form>
  );
}
