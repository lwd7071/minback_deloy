"use client";

import { useState } from "react";
import type { NotificationDto } from "@/types/student";

export function NotificationBell({
  unreadCount,
  notifications,
  onMarkRead,
}: {
  unreadCount: number;
  notifications: NotificationDto[];
  onMarkRead: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-secondary"
        aria-expanded={open}
        aria-label={`${unreadCount} thông báo chưa đọc`}
        onClick={() => setOpen((value) => !value)}
      >
        🔔{" "}
        {unreadCount ? (
          <span className="badge badge-error">{unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <Card
          className="stack"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: "min(88vw,380px)",
            zIndex: 40,
            maxHeight: 430,
            overflow: "auto",
          }}
        >
          {notifications.length ? (
            notifications.map((item) => (
              <button
                className="btn btn-ghost"
                style={{ textAlign: "left", justifyContent: "flex-start" }}
                key={item.id}
                onClick={() => onMarkRead(item.id)}
              >
                <span>{item.message}</span>
                {!item.readAt ? (
                  <span className="badge badge-info">Mới</span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="muted">Chưa có thông báo.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}

import { Card } from "./card";
