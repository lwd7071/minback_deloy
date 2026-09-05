"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";

type Step = "REQUEST_OTP" | "CONFIRM_OTP" | "SUCCESS";

export function ForgotPinForm({ classCode }: { classCode: string }) {
  const [step, setStep] = useState<Step>("REQUEST_OTP");
  const [mssv, setMssv] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mssv.trim()) {
      setError("Vui lòng nhập mã số sinh viên (MSSV)");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/v1/student/auth/forgot-pin/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classCode, mssv: mssv.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message ?? "Không thể gửi yêu cầu");
      }
      setStep("CONFIRM_OTP");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi OTP thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Mã OTP phải có đúng 6 chữ số");
      return;
    }
    if (newPin.length !== 6) {
      setError("Mã PIN mới phải có đúng 6 chữ số");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Mã PIN xác nhận không khớp");
      return;
    }
    if (newPin === "111111") {
      setError("Mã PIN mới không được là 111111");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/v1/student/auth/forgot-pin/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classCode,
          mssv: mssv.trim(),
          otp,
          newPin,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message ?? "Xác nhận OTP thất bại");
      }
      setSuccessMessage(body.data?.message ?? "Đặt lại mã PIN thành công!");
      setStep("SUCCESS");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lại mã PIN thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (step === "SUCCESS") {
    return (
      <div className="stack" style={{ textAlign: "center", gap: "16px" }}>
        <div
          className="badge badge-success"
          style={{ alignSelf: "center", padding: "6px 14px" }}
        >
          Thành công
        </div>
        <p style={{ margin: 0 }}>{successMessage}</p>
        <Link
          href={`/class/${encodeURIComponent(classCode)}`}
          className="button login-button"
        >
          Đăng nhập bằng mã PIN mới
        </Link>
      </div>
    );
  }

  if (step === "CONFIRM_OTP") {
    return (
      <form onSubmit={(e) => void handleConfirmOtp(e)} className="form-stack">
        <div className="form-notice" role="note">
          <p>
            Mã OTP 6 số đã được gửi tới email sinh viên của bạn (HCMUTE). Vui
            lòng kiểm tra hộp thư và nhập mã OTP bên dưới.
          </p>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="otp-input">
            Mã OTP (6 chữ số)
          </label>
          <OtpInput value={otp} onChange={setOtp} disabled={busy} />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="new-pin-input">
            Mã PIN mới (6 chữ số)
          </label>
          <input
            id="new-pin-input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="field-underline"
            placeholder="••••••"
            value={newPin}
            onChange={(e) =>
              setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={busy}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="confirm-pin-input">
            Xác nhận mã PIN mới
          </label>
          <input
            id="confirm-pin-input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="field-underline"
            placeholder="••••••"
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={busy}
            required
          />
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          loading={busy}
          disabled={
            busy ||
            otp.length !== 6 ||
            newPin.length !== 6 ||
            confirmPin.length !== 6
          }
        >
          Xác nhận đặt lại PIN
        </Button>

        <div className="split" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn-ghost button-sm"
            onClick={() => {
              setStep("REQUEST_OTP");
              setError(null);
            }}
            disabled={busy}
          >
            Quay lại bước trước
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void handleRequestOtp(e)} className="form-stack">
      <div className="form-notice" role="note">
        <p>
          Nhập MSSV của bạn. Hệ thống sẽ gửi mã OTP 6 chữ số tới email trường để
          giúp bạn đặt lại mã PIN.
        </p>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="forgot-mssv">
          Mã số sinh viên (MSSV)
        </label>
        <input
          id="forgot-mssv"
          type="text"
          className="field-underline"
          placeholder="Ví dụ: 22110001"
          value={mssv}
          onChange={(e) => setMssv(e.target.value)}
          disabled={busy}
          autoComplete="off"
          required
        />
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <Button loading={busy} disabled={busy || !mssv.trim()}>
        Gửi mã OTP qua email
      </Button>
    </form>
  );
}
