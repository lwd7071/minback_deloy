"use client";

import { useEffect, useState, useCallback } from "react";
import type { NotificationDto } from "@/types/student";

type ApiResult<T> =
  { data: T; meta?: Record<string, unknown> } | { error: { message: string } };

/**
 * Custom hook polling Notification tự động mỗi 10 giây.
 * Quy tắc:
 * - Chỉ poll khi tab browser đang visible (document.visibilityState === "visible").
 * - Dừng poll ngay khi tab hidden hoặc component unmount.
 * - Fetch lại ngay lập tức khi tab chuyển từ hidden -> visible.
 */
export function useNotificationPolling(options?: { unreadOnly?: boolean }) {
  const unreadOnly = options?.unreadOnly ?? false;

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const url = `/api/v1/student/notifications?page=1&pageSize=50${unreadOnly ? "&unreadOnly=true" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<NotificationDto[]>;

      if (!res.ok || !("data" in body)) {
        throw new Error(
          "error" in body ? body.error.message : "Không thể tải thông báo",
        );
      }

      setNotifications(body.data);
      if (body.meta) {
        setUnreadCount(Number(body.meta.unreadCount ?? 0));
        setTotal(Number(body.meta.total ?? 0));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(
        `/api/v1/student/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        },
      );
      if (res.ok) {
        // Cập nhật local state ngay lập tức
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, readAt: new Date().toISOString() }
              : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      void fetchNotifications();
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          void fetchNotifications();
        }
      }, 10_000); // 10 giây
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchNotifications(); // Fetch ngay khi tab active lại
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
  };
}
