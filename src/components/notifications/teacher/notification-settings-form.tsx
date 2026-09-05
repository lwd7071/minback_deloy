"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Alert } from "@/components/ui/alert";

export type Settings = {
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

export function NotificationSettingsForm({
  initialSettings,
}: {
  initialSettings: Settings;
}) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleEmail() {
    if (isToggling || isSendingTest) return;
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
      setMessage(
        "Đã gửi email thử nghiệm thành công tới địa chỉ email của bạn.",
      );
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

  return (
    <div className="settings-stack" aria-live="polite">
      <>
        {/* Main Email Toggle Section */}
        <div
          className="settings-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Mail size={18} className="text-primary" />
              <strong style={{ fontSize: "15px" }}>
                Gửi email khi công bố kết quả
              </strong>
            </div>
            <p
              className="muted settings-help"
              style={{ marginTop: "4px", fontSize: "13px" }}
            >
              Tự động gửi email thông báo tới sinh viên khi bài tập chuyển sang
              trạng thái <strong>Công bố (returned)</strong>. Điểm số và nhận
              xét chi tiết được bảo mật, sinh viên chỉ xem sau khi đăng nhập
              MinBack.
            </p>
          </div>
          <Toggle
            checked={settings.emailEnabled}
            disabled={isToggling || isSendingTest}
            label={settings.emailEnabled ? "Đang bật" : "Đang tắt"}
            onChange={() => void toggleEmail()}
          />
        </div>

        {/* Brevo Service & Sender Details */}
        <dl className="settings-details">
          <div style={{ marginBottom: "12px" }}>
            <dt>Trạng thái cấu hình Brevo</dt>
            <dd
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {settings.brevoConfigured ? (
                <span className="settings-state is-success">
                  <CheckCircle2 size={16} /> Đã cấu hình trên máy chủ
                </span>
              ) : (
                <span className="settings-state is-warning">
                  <AlertTriangle size={16} /> Chưa cấu hình đầy đủ (Thiếu API
                  Key/Sender Email)
                </span>
              )}
            </dd>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <dt>Tên người gửi (Sender Name)</dt>
            <dd style={{ margin: "4px 0 0", fontSize: "14px" }}>
              {settings.senderName ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Địa chỉ người gửi (Sender Email)</dt>
            <dd
              style={{
                margin: "4px 0 0",
                fontSize: "14px",
                fontFamily: "monospace",
              }}
            >
              {settings.senderEmail ?? "—"}
            </dd>
          </div>
        </dl>

        {/* Test Email Action Button */}
        <div>
          <button
            className="button button-secondary"
            type="button"
            disabled={isSendingTest || isToggling || !settings.brevoConfigured}
            onClick={() => void sendTest()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isSendingTest ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <Send size={14} />
            )}
            {isSendingTest ? "Đang gửi email thử…" : "Gửi email thử nghiệm"}
          </button>
          {!settings.brevoConfigured && (
            <span
              className="muted"
              style={{ marginLeft: "12px", fontSize: "13px" }}
            >
              (Cần cấu hình Brevo server env trước khi gửi thử)
            </span>
          )}
        </div>
      </>

      {/* Success Alert */}
      {message ? <Alert variant="success">{message}</Alert> : null}

      {/* Error Alert */}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
