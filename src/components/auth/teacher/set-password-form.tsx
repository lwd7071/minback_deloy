"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SetPasswordFormProps = { tokenHash: string };

export function SetPasswordForm({ tokenHash }: SetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.history.replaceState({}, document.title, "/admin/set-password");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/teacher/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tokenHash,
          password,
          passwordConfirmation,
        }),
      });
      const body = (await response.json()) as {
        data?: { teacher?: { id: string; displayName: string } };
        error?: { message?: string };
      };
      if (!response.ok || !body.data?.teacher) {
        throw new Error(body.error?.message ?? "Không thể thiết lập mật khẩu");
      }
      router.replace("/admin/classes");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể thiết lập mật khẩu",
      );
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={(event) => void submit(event)}>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        id="teacher-new-password"
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={loading}
        required
      />
      <Input
        id="teacher-password-confirmation"
        label="Xác nhận mật khẩu"
        type="password"
        autoComplete="new-password"
        value={passwordConfirmation}
        onChange={(event) => setPasswordConfirmation(event.target.value)}
        disabled={loading}
        required
      />
      <Button type="submit" loading={loading}>
        Hoàn tất thiết lập
      </Button>
    </form>
  );
}
