"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/teacher/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.replace("/teacher/login");
        router.refresh();
        return;
      }

      setError("Đăng xuất thất bại");
    } catch {
      setError("Đã xảy ra lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button button-secondary"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? "Đang đăng xuất…" : "Đăng xuất"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </>
  );
}
