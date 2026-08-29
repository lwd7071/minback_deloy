"use client";

import { useEffect, useState } from "react";

type Settings = {
  emailEnabled: boolean;
  brevoConfigured: boolean;
  senderEmail: string | null;
  senderName: string | null;
};

type ApiResult<T> = { data: T } | { error: { message: string } };

async function readResult<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResult<T>;
  if (!response.ok || !("data" in body)) {
    throw new Error("error" in body ? body.error.message : "Yêu cầu thất bại");
  }
  return body.data;
}

export function NotificationSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetch("/api/v1/teacher/settings/notifications", { cache: "no-store" })
      .then((response) => readResult<Settings>(response))
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải cấu hình",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function toggleEmail() {
    if (!settings) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/teacher/settings/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailEnabled: !settings.emailEnabled }),
      });
      setSettings(await readResult<Settings>(response));
      setMessage("Đã lưu cấu hình email.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu cấu hình",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        "/api/v1/teacher/settings/notifications/test",
        { method: "POST" },
      );
      await readResult<{ success: true }>(response);
      setMessage("Đã gửi email thử tới email của Teacher đang đăng nhập.");
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Không thể gửi email thử",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!settings && !error) return <p className="muted">Đang tải cấu hình…</p>;

  return (
    <div className="settings-stack">
      {settings ? (
        <>
          <div className="settings-row">
            <div>
              <strong>Gửi email khi công bố kết quả</strong>
              <p className="muted settings-help">
                Email chỉ báo có kết quả mới; điểm và feedback chỉ xem trong
                MinBack.
              </p>
            </div>
            <button
              className="button"
              type="button"
              disabled={busy}
              aria-pressed={settings.emailEnabled}
              onClick={() => void toggleEmail()}
            >
              {settings.emailEnabled ? "Đang bật" : "Đang tắt"}
            </button>
          </div>

          <dl className="settings-details">
            <div>
              <dt>Trạng thái Brevo</dt>
              <dd>
                {settings.brevoConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
              </dd>
            </div>
            <div>
              <dt>Sender name</dt>
              <dd>{settings.senderName ?? "—"}</dd>
            </div>
            <div>
              <dt>Sender email</dt>
              <dd>{settings.senderEmail ?? "—"}</dd>
            </div>
          </dl>

          <button
            className="button button-secondary"
            type="button"
            disabled={busy || !settings.brevoConfigured}
            onClick={() => void sendTest()}
          >
            Gửi email thử
          </button>
        </>
      ) : null}

      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
