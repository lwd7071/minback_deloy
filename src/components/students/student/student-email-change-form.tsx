"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";

export function StudentEmailChangeForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/v1/student/profile/email-change/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message ?? "Không thể gửi OTP");
      setRequested(true);
      setMessage("OTP đã được gửi tới email mới.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi OTP",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/v1/student/profile/email-change/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message ?? "OTP không hợp lệ");
      setMessage("Email đã được cập nhật thành công.");
      setRequested(false);
      setOtp("");
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Không thể xác nhận OTP",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="student-email-card">
      <h2>Email nhận thông báo</h2>
      <p className="muted">
        Dùng email trường để nhận thông báo khi kết quả được công bố.
      </p>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {!requested ? (
        <form
          onSubmit={(event) => void requestOtp(event)}
          className="stack-form"
        >
          <Input
            aria-label="Email mới"
            label="Email mới"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Đang gửi…" : "Gửi OTP"}
          </Button>
        </form>
      ) : (
        <div className="stack-form">
          <OtpInput
            aria-label="Mã OTP"
            value={otp}
            onChange={setOtp}
            disabled={busy}
          />
          <Button
            type="button"
            disabled={busy || otp.length !== 6}
            onClick={() => void confirmOtp()}
          >
            {busy ? "Đang xác nhận…" : "Xác nhận email"}
          </Button>
        </div>
      )}
    </Card>
  );
}
