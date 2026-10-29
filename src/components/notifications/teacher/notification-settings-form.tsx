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
    <div className="notification-settings" aria-live="polite">
      <section className="notification-settings-toggle">
        <div className="notification-settings-copy">
          <div className="notification-settings-title">
            <Mail size={20} aria-hidden="true" />
            <h2>Gửi email khi công bố kết quả</h2>
          </div>
          <p>
            Tự động thông báo cho sinh viên khi bài tập chuyển sang trạng thái
            <strong> Công bố</strong>. Điểm và nhận xét chỉ xem được sau khi
            đăng nhập MinBack.
          </p>
        </div>
        <div className="notification-settings-control">
          <Toggle
            checked={settings.emailEnabled}
            disabled={isToggling || isSendingTest}
            label={settings.emailEnabled ? "Đang bật" : "Đang tắt"}
            onChange={() => void toggleEmail()}
          />
        </div>
      </section>

      <section
        className="notification-provider"
        aria-labelledby="provider-title"
      >
        <div className="notification-section-heading">
          <div>
            <h3 id="provider-title">Dịch vụ gửi email</h3>
            <p className="muted">
              Thông tin cấu hình do quản trị hệ thống quản lý.
            </p>
          </div>
          <span
            className={`notification-provider-status ${settings.brevoConfigured ? "is-success" : "is-warning"}`}
          >
            {settings.brevoConfigured ? (
              <>
                <CheckCircle2 size={16} aria-hidden="true" /> Đã sẵn sàng
              </>
            ) : (
              <>
                <AlertTriangle size={16} aria-hidden="true" /> Chưa cấu hình đầy
                đủ
              </>
            )}
          </span>
        </div>

        <dl className="notification-sender-details">
          <div>
            <dt>Tên người gửi</dt>
            <dd>{settings.senderName ?? "—"}</dd>
          </div>
          <div>
            <dt>Email người gửi</dt>
            <dd className="notification-sender-email">
              {settings.senderEmail ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="notification-test-action">
          <button
            className="button button-secondary"
            type="button"
            disabled={isSendingTest || isToggling || !settings.brevoConfigured}
            onClick={() => void sendTest()}
          >
            {isSendingTest ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <Send size={14} />
            )}
            {isSendingTest ? "Đang gửi email thử…" : "Gửi email thử nghiệm"}
          </button>
          {!settings.brevoConfigured && (
            <p className="muted">
              Cần cấu hình Brevo trên máy chủ trước khi gửi thử.
            </p>
          )}
        </div>
      </section>

      {/* Success Alert */}
      {message ? <Alert variant="success">{message}</Alert> : null}

      {/* Error Alert */}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
