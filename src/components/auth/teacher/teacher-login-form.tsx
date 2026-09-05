"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TeacherLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/teacher/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/admin/classes");
        return;
      }

      const body = await res.json();

      if (res.status === 401) {
        setError("Thông tin đăng nhập không hợp lệ");
      } else if (res.status === 400) {
        setError(body?.error?.message ?? "Dữ liệu không hợp lệ");
      } else {
        setError("Đã xảy ra lỗi hệ thống");
      }
    } catch {
      setError("Đã xảy ra lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <Alert variant="error">{error}</Alert>}
      <Input
        id="teacher-email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        disabled={loading}
      />
      <Input
        id="teacher-password"
        label="Mật khẩu"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        disabled={loading}
      />
      <Button type="submit" loading={loading}>
        Đăng nhập
      </Button>
    </form>
  );
}
