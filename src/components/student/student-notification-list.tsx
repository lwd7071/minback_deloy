"use client";

import { useState } from "react";
import { useNotificationPolling } from "./use-notification-polling";

export function StudentNotificationList() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { notifications, unreadCount, loading, error, markAsRead } =
    useNotificationPolling({ unreadOnly });

  return (
    <div className="settings-stack">
      <div className="settings-row" style={{ alignItems: "center" }}>
        <div>
          <strong>Danh sách Thông báo</strong>
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: "8px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {unreadCount} chưa đọc
            </span>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          <span style={{ fontSize: "0.875rem" }}>Chỉ xem chưa đọc</span>
        </label>
      </div>

      {loading && notifications.length === 0 ? (
        <p className="muted">Đang tải thông báo…</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="muted">Không có thông báo nào.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  background: isUnread
                    ? "color-mix(in srgb, var(--accent) 5%, var(--surface))"
                    : "var(--surface)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: isUnread ? 600 : 400, fontSize: "0.9rem" }}>
                    {n.message}
                  </p>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {new Date(n.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>

                {isUnread && (
                  <button
                    className="button button-secondary"
                    style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    onClick={() => void markAsRead(n.id)}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
