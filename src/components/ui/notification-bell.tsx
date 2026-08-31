"use client";

import { useState } from "react";
import type { NotificationDto } from "@/types/student";
import { AppIcon } from "./app-icon";
import { Card } from "./card";

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
    <div className="notification-anchor">
      <button
        className="btn btn-secondary"
        aria-expanded={open}
        aria-label={`${unreadCount} thông báo chưa đọc`}
        onClick={() => setOpen((value) => !value)}
      >
        <AppIcon name="bell" />
        {unreadCount ? (
          <span className="badge badge-error">{unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <Card className="notification-popover">
          {notifications.length ? (
            notifications.map((item) => (
              <button
                className="notification-item"
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
