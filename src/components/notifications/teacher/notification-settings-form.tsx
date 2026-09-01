"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Send, Mail, RefreshCw } from "lucide-react";

type Settings = {
  emailEnabled: boolean;
  brevoConfigured: boolean;
  senderEmail: string | null;
  senderName: string | null;
};

type ApiResult<T> = { data: T } | { error: { message: string; code?: string } };

async function readResult<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok || !("data" in body)) {
    throw new Error("error" in body ? body.error.message : "Yêu cầu thất bại");
  }
  return body.data;
}

export function NotificationSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/teacher/settings/notifications", {
          cache: "no-store",
        });
        const data = await readResult<Settings>(response);
        if (active) setSettings(data);
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải cấu hình thông báo",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  async function toggleEmail() {
    if (!settings || isToggling || isSendingTest) return;
    setIsToggling(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/teacher/settings/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailEnabled: !settings.emailEnabled }),
      });
      const updated = await readResult<Settings>(response);
      setSettings(updated);
      setMessage(
        updated.emailEnabled
          ? "Đã bật tính năng gửi email khi công bố kết quả."
          : "Đã tắt tính năng gửi email thông báo.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu cài đặt email",
      );
    } finally {
      setIsToggling(false);
    }
  }

  async function sendTest() {
    if (isSendingTest || isToggling) return;
    setIsSendingTest(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        "/api/v1/teacher/settings/notifications/test",
        { method: "POST" },
      );
      await readResult<{ success: true }>(response);
      setMessage("Đã gửi email thử nghiệm thành công tới địa chỉ email của bạn.");
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Không thể gửi email thử",
      );
    } finally {
      setIsSendingTest(false);
    }
  }

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="settings-stack" aria-busy="true" aria-live="polite">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
          <div style={{ width: "60%" }}>
            <div style={{ height: "18px", width: "200px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "8px" }} />
            <div style={{ height: "14px", width: "320px", background: "#f1f5f9", borderRadius: "4px" }} />
          </div>
          <div style={{ height: "36px", width: "90px", background: "#e2e8f0", borderRadius: "6px" }} />
        </div>
        <p className="muted" style={{ margin: "16px 0 0", fontSize: "14px" }}>Đang tải cài đặt thông báo…</p>
      </div>
    );
  }

  return (
    <div className="settings-stack" aria-live="polite">
      {settings ? (
        <>
          {/* Main Email Toggle Section */}
          <div className="settings-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={18} className="text-primary" />
                <strong style={{ fontSize: "15px" }}>Gửi email khi công bố kết quả</strong>
              </div>
              <p className="muted settings-help" style={{ marginTop: "4px", fontSize: "13px" }}>
                Tự động gửi email thông báo tới sinh viên khi bài tập chuyển sang trạng thái <strong>Công bố (returned)</strong>.
                Điểm số và nhận xét chi tiết được bảo mật, sinh viên chỉ xem sau khi đăng nhập MinBack.
              </p>
            </div>
            <button
              className={`button ${settings.emailEnabled ? "button-primary" : "button-secondary"}`}
              type="button"
              disabled={isToggling || isSendingTest}
              aria-pressed={settings.emailEnabled}
              onClick={() => void toggleEmail()}
              style={{ minWidth: "100px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              {isToggling ? (
                <RefreshCw size={14} className="spin" />
              ) : null}
              {settings.emailEnabled ? "Đang bật" : "Đang tắt"}
            </button>
          </div>

          {/* Brevo Service & Sender Details */}
          <dl className="settings-details" style={{ margin: "20px 0", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ marginBottom: "12px" }}>
              <dt style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Trạng thái cấu hình Brevo</dt>
              <dd style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                {settings.brevoConfigured ? (
                  <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={16} /> Đã cấu hình trên máy chủ
                  </span>
                ) : (
                  <span style={{ color: "#d97706", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertTriangle size={16} /> Chưa cấu hình đầy đủ (Thiếu API Key/Sender Email)
                  </span>
                )}
              </dd>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <dt style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Tên người gửi (Sender Name)</dt>
              <dd style={{ margin: "4px 0 0", fontSize: "14px" }}>{settings.senderName ?? "—"}</dd>
            </div>
            <div>
              <dt style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Địa chỉ người gửi (Sender Email)</dt>
              <dd style={{ margin: "4px 0 0", fontSize: "14px", fontFamily: "monospace" }}>{settings.senderEmail ?? "—"}</dd>
            </div>
          </dl>

          {/* Test Email Action Button */}
          <div>
            <button
              className="button button-secondary"
              type="button"
              disabled={isSendingTest || isToggling || !settings.brevoConfigured}
              onClick={() => void sendTest()}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              {isSendingTest ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Send size={14} />
              )}
              {isSendingTest ? "Đang gửi email thử…" : "Gửi email thử nghiệm"}
            </button>
            {!settings.brevoConfigured && (
              <span className="muted" style={{ marginLeft: "12px", fontSize: "13px" }}>
                (Cần cấu hình Brevo server env trước khi gửi thử)
              </span>
            )}
          </div>
        </>
      ) : null}

      {/* Success Alert */}
      {message ? (
        <div
          className="form-success"
          role="status"
          style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "6px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <CheckCircle2 size={16} />
          {message}
        </div>
      ) : null}

      {/* Error Alert */}
      {error ? (
        <div
          className="form-error"
          role="alert"
          style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}
    </div>
  );
}
